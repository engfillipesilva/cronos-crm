/**
 * Aplica máscara de privacidade ao CPF: ***.456.789-**
 */
export function privacyMaskCpf(cpf) {
  if (!cpf) return 'Não informado';
  const digits = String(cpf).replace(/\D/g, '');
  if (digits.length === 11) {
    return `***.${digits.substring(3, 6)}.${digits.substring(6, 9)}-**`;
  }
  return cpf;
}

/**
 * Máscara de formatação padrão: 000.000.000-00
 */
export function formatCpf(cpf) {
  if (!cpf) return '';
  const digits = String(cpf).replace(/\D/g, '');
  if (digits.length <= 11) {
    let masked = digits;
    if (masked.length > 3) masked = masked.replace(/^(\d{3})(\d)/, '$1.$2');
    if (masked.length > 6) masked = masked.replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3');
    if (masked.length > 9) masked = masked.replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
    return masked;
  }
  return cpf;
}

/**
 * Normaliza uma string removendo acentos e convertendo para minúsculas.
 */
export function normalizeString(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ç/g, 'c');
}
