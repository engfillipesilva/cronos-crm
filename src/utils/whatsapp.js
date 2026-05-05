/**
 * Gera o link do WhatsApp Web com template de mensagem
 * @param {string} phone - Número do telefone (apenas dígitos)
 * @param {string} name - Nome do cliente para o template
 * @param {string} customMessage - Mensagem customizada (opcional)
 * @returns {string} URL formatada do WhatsApp
 */
export function generateWhatsAppLink(phone, name, customMessage) {
  // Remove tudo que não é dígito
  const cleanPhone = phone.replace(/\D/g, '');

  // Adiciona código do país se não tiver
  const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

  // Template padrão ou mensagem customizada
  const message = customMessage || `Olá, tudo bem?\nFalo com ${name}?`;

  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${fullPhone}?text=${encodedMessage}`;
}

/**
 * Formata telefone para exibição
 * @param {string} phone - Número do telefone
 * @returns {string} Telefone formatado
 */
export function formatPhone(phone) {
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 11) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  }
  if (clean.length === 10) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  }
  return phone;
}
