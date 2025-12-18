import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';
import { spacing, radii, fontSizes } from '../theme';
import { ValidationResult } from '../utils/string';

interface ValidatedInputProps extends TextInputProps {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    validate?: (value: string) => ValidationResult;
    required?: boolean;
    error?: string;
    hint?: string;
    validateOnBlur?: boolean;
}

/**
 * ValidatedInput - Input com validação inline
 * 
 * Uso:
 * ```tsx
 * <ValidatedInput
 *   label="Nome"
 *   value={name}
 *   onChangeText={setName}
 *   validate={(v) => validateRequired(v, 'Nome')}
 *   required
 * />
 * ```
 */
export default function ValidatedInput({
    label,
    value,
    onChangeText,
    validate,
    required = false,
    error: externalError,
    hint,
    validateOnBlur = true,
    ...textInputProps
}: ValidatedInputProps) {
    const { theme } = useThemeCtx();
    const [touched, setTouched] = React.useState(false);
    const [internalError, setInternalError] = React.useState<string | undefined>();

    const error = externalError || internalError;
    const showError = touched && !!error;

    const handleBlur = () => {
        setTouched(true);
        if (validateOnBlur && validate) {
            const result = validate(value);
            setInternalError(result.valid ? undefined : result.message);
        }
    };

    const handleChangeText = (text: string) => {
        onChangeText(text);
        // Clear error when user starts typing
        if (internalError) {
            setInternalError(undefined);
        }
    };

    const borderColor = showError
        ? '#D90429'
        : touched && !error
            ? '#16A34A'
            : theme.border;

    return (
        <View style={styles.container}>
            <View style={styles.labelRow}>
                <Text style={[styles.label, { color: theme.text }]}>
                    {label}
                    {required && <Text style={{ color: '#D90429' }}> *</Text>}
                </Text>
                {hint && !showError && (
                    <Text style={[styles.hint, { color: theme.textSecondary }]}>{hint}</Text>
                )}
            </View>
            <TextInput
                style={[
                    styles.input,
                    {
                        backgroundColor: theme.card,
                        color: theme.text,
                        borderColor,
                    },
                ]}
                value={value}
                onChangeText={handleChangeText}
                onBlur={handleBlur}
                placeholderTextColor={theme.textSecondary}
                {...textInputProps}
            />
            {showError && (
                <View style={styles.errorContainer}>
                    <Text style={[styles.errorIcon]}>⚠️</Text>
                    <Text style={[styles.errorText, { color: '#D90429' }]}>{error}</Text>
                </View>
            )}
        </View>
    );
}

/**
 * useFormValidation - Hook para validação de formulários
 */
export function useFormValidation<T extends Record<string, any>>(
    initialValues: T,
    validators: { [K in keyof T]?: (value: T[K]) => ValidationResult }
) {
    const [values, setValues] = React.useState<T>(initialValues);
    const [errors, setErrors] = React.useState<Partial<Record<keyof T, string>>>({});
    const [touched, setTouched] = React.useState<Partial<Record<keyof T, boolean>>>({});

    const setValue = <K extends keyof T>(key: K, value: T[K]) => {
        setValues(prev => ({ ...prev, [key]: value }));
        // Clear error when value changes
        if (errors[key]) {
            setErrors(prev => ({ ...prev, [key]: undefined }));
        }
    };

    const setFieldTouched = (key: keyof T) => {
        setTouched(prev => ({ ...prev, [key]: true }));
        // Validate on touch
        const validator = validators[key];
        if (validator) {
            const result = validator(values[key]);
            if (!result.valid) {
                setErrors(prev => ({ ...prev, [key]: result.message }));
            }
        }
    };

    const validateAll = (): boolean => {
        const newErrors: Partial<Record<keyof T, string>> = {};
        let isValid = true;

        for (const key of Object.keys(validators) as (keyof T)[]) {
            const validator = validators[key];
            if (validator) {
                const result = validator(values[key]);
                if (!result.valid) {
                    newErrors[key] = result.message;
                    isValid = false;
                }
            }
        }

        setErrors(newErrors);
        setTouched(Object.keys(validators).reduce((acc, key) => ({ ...acc, [key]: true }), {}));
        return isValid;
    };

    const reset = (newValues?: T) => {
        setValues(newValues || initialValues);
        setErrors({});
        setTouched({});
    };

    const getFieldProps = (key: keyof T) => ({
        value: values[key],
        error: touched[key] ? errors[key] : undefined,
        onChangeText: (text: string) => setValue(key, text as T[keyof T]),
        onBlur: () => setFieldTouched(key),
    });

    return {
        values,
        errors,
        touched,
        setValue,
        setFieldTouched,
        validateAll,
        reset,
        getFieldProps,
        isValid: Object.keys(errors).length === 0,
    };
}

const styles = StyleSheet.create({
    container: {
        marginBottom: spacing.md,
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    label: {
        fontSize: fontSizes.sm,
        fontWeight: '500',
    },
    hint: {
        fontSize: fontSizes.xs,
    },
    input: {
        padding: spacing.sm + 2,
        borderRadius: radii.md,
        borderWidth: 1,
        fontSize: fontSizes.base,
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.xs,
        gap: 4,
    },
    errorIcon: {
        fontSize: 12,
    },
    errorText: {
        fontSize: fontSizes.xs,
        flex: 1,
    },
});
