/**
 * Utilitários para manipulação de strings
 */

/**
 * Capitaliza o nome de uma empresa de forma consistente
 * Primeira letra de cada palavra em maiúsculo, resto em minúsculo
 * Mantém apóstrofos e caracteres especiais
 */
export function capitalizeCompanyName(name: string): string {
  if (!name || typeof name !== 'string') {
    return '';
  }
  
  return name
    .trim()
    .toLowerCase()
    .split(' ')
    .map(word => {
      // Manter casos especiais como FastSavory's
      if (word === 'fastsavorys' || word === 'fastsavory\'s') {
        return 'FastSavory\'s';
      }
      
      // Capitalizar primeira letra
      if (word.length === 0) return '';
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Capitaliza qualquer texto genérico
 */
export function capitalizeText(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  return text
    .trim()
    .split(' ')
    .map(word => {
      if (word.length === 0) return '';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Verifica se um nome de empresa é o FastSavory's
 */
export function isFastSavorys(name: string): boolean {
  if (!name) return false;
  const normalized = name.toLowerCase().replace(/[^a-z]/g, '');
  return normalized === 'fastsavorys';
}
