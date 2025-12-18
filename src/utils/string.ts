/**
 * Utilitários para manipulação de strings
 */

/**
 * Capitaliza o nome de uma empresa de forma consistente
 * Preserva espaços, caracteres especiais (&, ', etc.) e formatação original
 * Apenas capitaliza a primeira letra de cada palavra
 */
export function capitalizeCompanyName(name: string): string {
  if (!name || typeof name !== 'string') {
    return '';
  }

  // Casos especiais conhecidos
  const lowerName = name.toLowerCase().replace(/[^a-z]/g, '');
  if (lowerName === 'fastsavorys') {
    return 'FastSavory\'s';
  }

  // Preservar o nome original, apenas capitalizando cada palavra
  // Usa regex para dividir por espaços mantendo os separadores
  return name
    .trim()
    .split(/(\s+)/) // Divide por espaços mas mantém os espaços no array
    .map(part => {
      // Se for apenas espaços, retorna como está
      if (/^\s+$/.test(part)) return part;

      // Se for vazio, retorna vazio
      if (part.length === 0) return '';

      // Capitaliza primeira letra, mantém o resto como está
      // Isso preserva caracteres especiais como &, ', etc.
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join('');
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
 * Verifica se um nome de empresa é o FastSavory's (empresa do sistema)
 * Esta empresa é usada internamente e não deve ser contada nas métricas de clientes
 */
export function isFastSavorys(name: string): boolean {
  if (!name) return false;
  const normalized = name.toLowerCase().replace(/[^a-z]/g, '');
  return normalized === 'fastsavorys';
}

/**
 * Verifica se uma empresa é a empresa do sistema (Fast Cash Flow / FastSavory's)
 * Empresas do sistema não devem ser contadas em métricas de clientes
 */
export function isSystemCompany(name: string | null | undefined): boolean {
  if (!name) return false;
  const normalized = name.toLowerCase().replace(/[^a-z]/g, '');
  return normalized === 'fastsavorys' || normalized === 'fastcashflow';
}

/**
 * Filtra empresas do sistema de uma lista
 * Útil para excluir FastSavory's das métricas de clientes
 */
export function filterOutSystemCompanies<T extends { name?: string; username?: string }>(companies: T[]): T[] {
  return companies.filter(c => !isSystemCompany(c.name) && !isSystemCompany(c.username));
}

// ============================================
// Funções de Validação Inline
// ============================================

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

/**
 * Valida se um campo obrigatório está preenchido
 */
export function validateRequired(value: string | null | undefined, fieldName: string = 'Campo'): ValidationResult {
  if (!value || value.trim() === '') {
    return { valid: false, message: `${fieldName} é obrigatório` };
  }
  return { valid: true };
}

/**
 * Valida tamanho mínimo de texto
 */
export function validateMinLength(value: string, minLength: number, fieldName: string = 'Campo'): ValidationResult {
  if (!value || value.length < minLength) {
    return { valid: false, message: `${fieldName} deve ter pelo menos ${minLength} caracteres` };
  }
  return { valid: true };
}

/**
 * Valida formato de email
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || email.trim() === '') {
    return { valid: true }; // Email é opcional, se vazio é válido
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, message: 'Email inválido' };
  }
  return { valid: true };
}

/**
 * Valida formato de telefone brasileiro (aceita vários formatos)
 */
export function validatePhone(phone: string): ValidationResult {
  if (!phone || phone.trim() === '') {
    return { valid: true }; // Telefone é opcional
  }
  // Remove caracteres não numéricos
  const digits = phone.replace(/\D/g, '');
  // Telefone válido: 10 ou 11 dígitos (com DDD)
  if (digits.length < 10 || digits.length > 11) {
    return { valid: false, message: 'Telefone deve ter 10 ou 11 dígitos' };
  }
  return { valid: true };
}

/**
 * Valida se um valor monetário é positivo
 */
export function validatePositiveValue(cents: number, fieldName: string = 'Valor'): ValidationResult {
  if (!cents || cents <= 0) {
    return { valid: false, message: `${fieldName} deve ser maior que zero` };
  }
  return { valid: true };
}

/**
 * Formata telefone brasileiro para exibição
 */
export function formatPhoneBR(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

/**
 * Normaliza texto removendo acentos (útil para buscas)
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
