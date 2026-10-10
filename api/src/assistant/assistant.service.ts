import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'llama3.1:8b';

@Injectable()
export class AssistantService {
  constructor(private prisma: PrismaService) {}

  /** Arma el contexto de negocio que se le pasa al modelo. */
  private async buildContext(): Promise<string> {
    const hoy = new Date(new Date().toDateString());
    const hace7 = new Date(Date.now() - 7 * 86400000);
    const en15dias = new Date(Date.now() + 15 * 86400000);

    const [ventasHoy, ventas7d, topSemana, stockBajo, porVencer] = await Promise.all([
      this.prisma.sale.aggregate({
        where: { createdAt: { gte: hoy }, voidedAt: null },
        _count: true,
        _sum: { total: true },
      }),
      this.prisma.sale.aggregate({
        where: { createdAt: { gte: hace7 }, voidedAt: null },
        _count: true,
        _sum: { total: true },
      }),
      this.prisma.$queryRaw<{ name: string; unidades: bigint; total: number }[]>`
        SELECT p.name, sum(si.quantity)::bigint AS unidades, sum(si.total)::float AS total
        FROM "SaleItem" si
        JOIN "Sale" s ON s.id = si."saleId"
        JOIN "Product" p ON p.id = si."productId"
        WHERE s."createdAt" >= ${hace7} AND s."voidedAt" IS NULL
        GROUP BY p.name ORDER BY total DESC LIMIT 5`,
      this.prisma.product.findMany({
        where: { active: true },
        select: { name: true, stock: true, minStock: true },
      }),
      this.prisma.productBatch.findMany({
        where: { expiresAt: { lte: en15dias }, quantity: { gt: 0 } },
        include: { product: { select: { name: true } } },
        orderBy: { expiresAt: 'asc' },
        take: 15,
      }),
    ]);

    const bajos = stockBajo.filter((p) => p.stock <= p.minStock);
    const clp = (n: number) => '$' + Math.round(n).toLocaleString('es-CL');
    const now = Date.now();

    return [
      `Fecha actual: ${new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`,
      `Ventas de HOY: ${ventasHoy._count} ventas, total ${clp(Number(ventasHoy._sum.total ?? 0))}.`,
      `Ventas últimos 7 días: ${ventas7d._count} ventas, total ${clp(Number(ventas7d._sum.total ?? 0))}.`,
      `Top productos de la semana: ${topSemana.map((t) => `${t.name} (${Number(t.unidades)} un., ${clp(t.total)})`).join('; ') || 'sin ventas'}.`,
      `Productos con stock bajo (stock <= mínimo): ${bajos.map((p) => `${p.name} (quedan ${p.stock})`).join('; ') || 'ninguno'}.`,
      `Lotes que vencen en los próximos 15 días: ${porVencer.map((b) => `${b.product.name} lote ${b.lotCode}, ${b.quantity} un., vence en ${Math.ceil((b.expiresAt.getTime() - now) / 86400000)} días`).join('; ') || 'ninguno'}.`,
    ].join('\n');
  }

  private async ollama(system: string, user: string): Promise<string> {
    try {
      const res = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          stream: false,
          options: { temperature: 0.3 },
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
        signal: AbortSignal.timeout(90000),
      });
      if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
      const data = (await res.json()) as { message?: { content?: string } };
      const answer = data.message?.content?.trim();
      if (!answer) throw new Error('respuesta vacía');
      return answer;
    } catch (e) {
      throw new ServiceUnavailableException(
        'El asistente IA no está disponible (¿Ollama corriendo en el Mac?). ' + String(e),
      );
    }
  }

  async ask(question: string): Promise<{ answer: string }> {
    const context = await this.buildContext();
    const system = [
      'Eres el asistente del sistema de ventas Ventra (FHAN Labs), un negocio en Chile.',
      'Responde SIEMPRE en español, breve y directo (máximo 6 líneas).',
      'Usa EXCLUSIVAMENTE los datos del contexto; si algo no está en el contexto, di que no tienes ese dato.',
      'Los montos son pesos chilenos (CLP).',
      '--- CONTEXTO DEL NEGOCIO ---',
      context,
    ].join('\n');
    return { answer: await this.ollama(system, question) };
  }

  async dailyBrief(): Promise<{ text: string }> {
    const context = await this.buildContext();
    try {
      const text = await this.ollama(
        [
          'Redacta un resumen del día del negocio para enviar por WhatsApp al dueño.',
          'En español, máximo 8 líneas, con 2-3 emojis sobrios, montos en CLP.',
          'Estructura: ventas de hoy, comparación con la semana, alertas de stock bajo y vencimientos si los hay.',
          'Solo el mensaje, sin saludos de IA ni explicaciones.',
          '--- DATOS ---',
          context,
        ].join('\n'),
        'Genera el resumen de hoy.',
      );
      return { text };
    } catch {
      // Fallback sin IA: el resumen sale igual aunque Ollama esté caído
      return { text: `📊 Resumen Ventra\n${context}` };
    }
  }
}
