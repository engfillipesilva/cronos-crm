import * as XLSX from 'xlsx';
import fs from 'fs';

// Função auxiliar para gerar nomes dinâmicos de telefone (telefone_01, telefone_02, etc)
function buildPhones(count, baseDdd, startNum) {
  const phones = {};
  for (let i = 1; i <= count; i++) {
    const key = `telefone_${String(i).padStart(2, '0')}`;
    const number = String(startNum + i - 1);
    // Cria formato ex: (11) 99999-0001
    phones[key] = `(${baseDdd}) 9${number.substring(0,4)}-${number.substring(4)}`;
  }
  return phones;
}

const data = [
  {
    "Nome Completo": "João dos 10 Telefones",
    "CPF": "11122233344",
    ...buildPhones(10, 11, 88880001) // 10 telefones
  },
  {
    "Nome Completo": "Maria Simples",
    "CPF": "555.666.777-88",
    ...buildPhones(1, 85, 77770001) // 1 telefone apenas
  },
  {
    "Nome Completo": "Carlos dos 4 Contatos",
    "CPF": "12345678900",
    ...buildPhones(4, 86, 66660001) // 4 telefones
  }
];

// O XLSX.utils precisa garantir que TODAS as chaves existam em todos os objetos, 
// senão as colunas podem sumir. O Excel lida bem com células vazias.
// Vamos normalizar os dados para que todos os objetos tenham até telefone_10
const normalizedData = data.map(row => {
  const newRow = { ...row };
  for (let i = 1; i <= 10; i++) {
    const key = `telefone_${String(i).padStart(2, '0')}`;
    if (!newRow[key]) {
      newRow[key] = ""; // Célula vazia no Excel para quem não tem os 10 telefones
    }
  }
  return newRow;
});

const worksheet = XLSX.utils.json_to_sheet(normalizedData);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, "Clientes");

XLSX.writeFile(workbook, "modelo_clientes.xlsx");

console.log("Arquivo modelo_clientes.xlsx atualizado com a nova estrutura!");
