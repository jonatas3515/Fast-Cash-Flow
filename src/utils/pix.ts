/**
 * Utilitário para geração de payload PIX (BR Code / EMV)
 * Implementação pura TypeScript, sem dependências externas
 */

export interface PixParams {
    /** Chave PIX (CPF, CNPJ, email, telefone ou chave aleatória) */
    pixKey: string;
    /** Nome do beneficiário (máx 25 caracteres) */
    merchantName: string;
    /** Cidade do beneficiário (máx 15 caracteres) */
    merchantCity: string;
    /** Valor em reais (ex: 10.50). Se 0 ou null, gera código aberto */
    amount?: number;
    /** Identificador da transação (máx 25 chars, alfanumérico) */
    txid?: string;
    /** Descrição adicional (uso futuro) */
    description?: string;
}

/**
 * Remove acentos e caracteres especiais, mantendo apenas alfanuméricos e espaços
 */
export function normalizeString(str: string): string {
    if (!str) return '';

    // Mapa de substituição de caracteres acentuados
    const accentsMap: Record<string, string> = {
        'á': 'a', 'à': 'a', 'ã': 'a', 'â': 'a', 'ä': 'a',
        'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
        'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
        'ó': 'o', 'ò': 'o', 'õ': 'o', 'ô': 'o', 'ö': 'o',
        'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u',
        'ç': 'c', 'ñ': 'n',
        'Á': 'A', 'À': 'A', 'Ã': 'A', 'Â': 'A', 'Ä': 'A',
        'É': 'E', 'È': 'E', 'Ê': 'E', 'Ë': 'E',
        'Í': 'I', 'Ì': 'I', 'Î': 'I', 'Ï': 'I',
        'Ó': 'O', 'Ò': 'O', 'Õ': 'O', 'Ô': 'O', 'Ö': 'O',
        'Ú': 'U', 'Ù': 'U', 'Û': 'U', 'Ü': 'U',
        'Ç': 'C', 'Ñ': 'N',
    };

    let normalized = '';
    for (const char of str) {
        normalized += accentsMap[char] ?? char;
    }

    // Remove caracteres não alfanuméricos (exceto espaço)
    return normalized.replace(/[^a-zA-Z0-9 ]/g, '').trim();
}

/**
 * Calcula CRC16 (CCITT-FALSE) para o payload PIX
 * Polinômio: 0x1021, valor inicial: 0xFFFF
 */
export function computeCRC16(payload: string): string {
    const polynomial = 0x1021;
    let crc = 0xFFFF;

    for (let i = 0; i < payload.length; i++) {
        const byte = payload.charCodeAt(i);
        crc ^= (byte << 8);

        for (let j = 0; j < 8; j++) {
            if ((crc & 0x8000) !== 0) {
                crc = ((crc << 1) ^ polynomial) & 0xFFFF;
            } else {
                crc = (crc << 1) & 0xFFFF;
            }
        }
    }

    return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Formata um campo EMV no formato TLV (Tag-Length-Value)
 */
function formatEMVField(id: string, value: string): string {
    const length = value.length.toString().padStart(2, '0');
    return `${id}${length}${value}`;
}

/**
 * Formata valor monetário para o padrão PIX (2 casas decimais, ponto como separador)
 */
function formatAmount(amount: number): string {
    return amount.toFixed(2);
}

/**
 * Gera o payload PIX completo no formato EMV/BR Code
 * 
 * Estrutura do payload:
 * - 00: Payload Format Indicator (01)
 * - 26: Merchant Account Information (contém chave PIX)
 *   - 00: GUI (br.gov.bcb.pix)
 *   - 01: Chave PIX
 *   - 02: Descrição (opcional)
 * - 52: Merchant Category Code (0000 = não informado)
 * - 53: Transaction Currency (986 = BRL)
 * - 54: Transaction Amount (opcional)
 * - 58: Country Code (BR)
 * - 59: Merchant Name
 * - 60: Merchant City
 * - 62: Additional Data Field Template
 *   - 05: Reference Label (txid)
 * - 63: CRC16 (calculado automaticamente)
 */
export function generatePixPayload(params: PixParams): string {
    const { pixKey, merchantName, merchantCity, amount, txid, description } = params;

    // Validações básicas
    if (!pixKey || !merchantName || !merchantCity) {
        throw new Error('Chave PIX, nome e cidade são obrigatórios');
    }

    // Normalizar strings
    const normalizedName = normalizeString(merchantName).slice(0, 25);
    const normalizedCity = normalizeString(merchantCity).slice(0, 15);
    const normalizedTxid = txid ? normalizeString(txid).replace(/\s/g, '').slice(0, 25).toUpperCase() : '';
    const normalizedDesc = description ? normalizeString(description).slice(0, 50) : '';

    // Construir Merchant Account Information (ID 26)
    let merchantAccountInfo = formatEMVField('00', 'br.gov.bcb.pix');
    merchantAccountInfo += formatEMVField('01', pixKey);
    if (normalizedDesc) {
        merchantAccountInfo += formatEMVField('02', normalizedDesc);
    }

    // Construir Additional Data Field Template (ID 62)
    let additionalData = '';
    if (normalizedTxid) {
        additionalData = formatEMVField('05', normalizedTxid);
    } else {
        // TXID vazio com três asteriscos indica transação única
        additionalData = formatEMVField('05', '***');
    }

    // Montar payload (sem CRC)
    let payload = '';

    // 00 - Payload Format Indicator
    payload += formatEMVField('00', '01');

    // 26 - Merchant Account Information
    payload += formatEMVField('26', merchantAccountInfo);

    // 52 - Merchant Category Code
    payload += formatEMVField('52', '0000');

    // 53 - Transaction Currency (986 = BRL)
    payload += formatEMVField('53', '986');

    // 54 - Transaction Amount (apenas se valor > 0)
    if (amount && amount > 0) {
        payload += formatEMVField('54', formatAmount(amount));
    }

    // 58 - Country Code
    payload += formatEMVField('58', 'BR');

    // 59 - Merchant Name
    payload += formatEMVField('59', normalizedName);

    // 60 - Merchant City
    payload += formatEMVField('60', normalizedCity);

    // 62 - Additional Data Field Template
    if (additionalData) {
        payload += formatEMVField('62', additionalData);
    }

    // 63 - CRC16 (placeholder para cálculo)
    payload += '6304';

    // Calcular e adicionar CRC16
    const crc = computeCRC16(payload);
    payload += crc;

    return payload;
}

/**
 * Valida se uma string é um payload PIX válido (verificação básica)
 */
export function validatePixPayload(payload: string): boolean {
    if (!payload || payload.length < 20) return false;

    // Deve começar com "00020101" (formato + PIX estático)
    if (!payload.startsWith('0002')) return false;

    // Deve conter o indicador de moeda BRL
    if (!payload.includes('5303986')) return false;

    // Deve terminar com CRC (6304 + 4 chars hex)
    const crcMatch = payload.match(/6304([0-9A-F]{4})$/);
    if (!crcMatch) return false;

    // Verificar CRC
    const payloadWithoutCRC = payload.slice(0, -4);
    const expectedCRC = computeCRC16(payloadWithoutCRC);

    return crcMatch[1] === expectedCRC;
}
