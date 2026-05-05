import { format, addMonths, differenceInDays, isPast, isToday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Cria data de follow-up padrão (6 meses a partir de agora)
 */
export function createDefaultFollowUpDate(fromDate = new Date()) {
  return addMonths(fromDate, 6);
}

/**
 * Formata data para exibição
 */
export function formatDate(date) {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'dd/MM/yyyy', { locale: ptBR });
}

/**
 * Formata data relativa (ex: "em 5 dias", "há 3 dias")
 */
export function formatRelativeDate(date) {
  const d = typeof date === 'string' ? parseISO(date) : date;
  const days = differenceInDays(d, new Date());

  if (isToday(d)) return 'Hoje';
  if (days === 1) return 'Amanhã';
  if (days === -1) return 'Ontem';
  if (days > 0) return `Em ${days} dias`;
  return `Há ${Math.abs(days)} dias`;
}

/**
 * Retorna status do follow-up baseado na data
 */
export function getFollowUpStatus(date) {
  const d = typeof date === 'string' ? parseISO(date) : date;
  const days = differenceInDays(d, new Date());

  if (isPast(d) && !isToday(d)) return 'overdue';
  if (days <= 7) return 'soon';
  return 'normal';
}

/**
 * Formata data para input date
 */
export function toInputDate(date) {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'yyyy-MM-dd');
}
