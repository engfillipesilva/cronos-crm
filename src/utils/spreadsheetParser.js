import * as XLSX from 'xlsx';

/**
 * Lê arquivo XLSX/CSV e retorna array de clientes
 * Colunas esperadas: Nome completo, CPF mascarado, Telefone 1..N, Cidade, Estado
 * @param {File} file - Arquivo .xlsx ou .csv
 * @returns {Promise<Array>} Array de objetos de clientes
 */
export async function parseSpreadsheet(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        const clients = rows.map((row) => {
          const keys = Object.keys(row);

          // Tenta encontrar colunas por padrão de nome
          const nameKey = keys.find(k => /nome/i.test(k)) || keys[0];
          const cpfKey = keys.find(k => /cpf/i.test(k)) || keys[1];
          const cityKey = keys.find(k => /cidade|munic/i.test(k));
          const stateKey = keys.find(k => /estado|uf/i.test(k));

          // Coleta todos os telefones (colunas com "telefone", "tel", "fone", "celular")
          const phoneKeys = keys.filter(k => /tel|fone|celular|whats/i.test(k));
          const phones = phoneKeys
            .map(k => String(row[k]).trim())
            .filter(p => p && p !== '' && p !== '0' && p.length >= 8);

          return {
            full_name: String(row[nameKey] || '').trim(),
            cpf_masked: String(row[cpfKey] || '').trim(),
            city: cityKey ? String(row[cityKey]).trim() : '',
            state: stateKey ? String(row[stateKey]).trim() : '',
            phones: phones.length > 0 ? phones : ['N/A'],
          };
        }).filter(c => c.full_name);

        resolve(clients);
      } catch (err) {
        reject(new Error(`Erro ao processar planilha: ${err.message}`));
      }
    };

    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsArrayBuffer(file);
  });
}
