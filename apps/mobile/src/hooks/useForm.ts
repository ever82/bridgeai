import { useState, useCallback, useMemo } from 'react';
import { z, type ZodType } from 'zod';

/**
 * Form field state
 */
interface FieldState<T> {
  value: T;
  error?: string;
  touched: boolean;
  dirty: boolean;
}

/**
 * Form state containing all fields
 */
type FormState<T extends Record<string, unknown>> = {
  [K in keyof T]: FieldState<T[K]>;
};

/**
 * Configuration for a form field
 */
interface FieldConfig<T> {
  initialValue: T;
  validate?: (value: T) => string | undefined;
  required?: boolean;
}

/**
 * Form configuration
 */
type FormConfig<T extends Record<string, unknown>> = {
  [K in keyof T]: FieldConfig<T[K]>;
};

/**
 * Options for useForm hook
 */
interface UseFormOptions<T extends Record<string, unknown>> {
  schema?: ZodType<T>;
  onSubmit?: (values: T) => void | Promise<void>;
  onError?: (errors: Record<string, string>) => void;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

/**
 * Return type of useForm hook
 */
interface UseFormReturn<T extends Record<string, unknown>> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  dirty: Partial<Record<keyof T, boolean>>;
  isValid: boolean;
  isSubmitting: boolean;
  isDirty: boolean;
  setValue: <K extends keyof T>(field: K, value: T[K]) => void;
  setError: <K extends keyof T>(field: K, error: string | undefined) => void;
  clearError: <K extends keyof T>(field: K) => void;
  touchField: <K extends keyof T>(field: K) => void;
  reset: (newValues?: Partial<T>) => void;
  validateField: <K extends keyof T>(field: K) => boolean;
  validateAll: () => boolean;
  handleSubmit: (e?: { preventDefault?: () => void }) => Promise<void>;
  getFieldProps: <K extends keyof T>(field: K) => {
    value: T[K];
    onChange: (value: T[K]) => void;
    onBlur: () => void;
    error: string | undefined;
  };
}

/**
 * React Hook Form inspired form management hook
 *
 * @example
 * const form = useForm({
 *   schema: loginSchema,
 *   onSubmit: async (values) => {
 *     await login(values);
 *   },
 * });
 *
 * // In your component:
 * <TextInput
 *   {...form.getFieldProps('email')}
 *   placeholder="Email"
 * />
 * <TextInput
 *   {...form.getFieldProps('password')}
 *   placeholder="Password"
 *   secureTextEntry
 * />
 * <Button
 *   title="Login"
 *   onPress={form.handleSubmit}
 *   disabled={!form.isValid || form.isSubmitting}
 * />
 */
export function useForm<T extends Record<string, unknown>>(
  config: FormConfig<T>,
  options: UseFormOptions<T> = {}
): UseFormReturn<T> {
  const {
    schema,
    onSubmit,
    onError,
    validateOnChange = true,
    validateOnBlur = true,
  } = options;

  // Initialize form state
  const initialState = useMemo(() => {
    const state = {} as FormState<T>;
    for (const key of Object.keys(config) as Array<keyof T>) {
      state[key] = {
        value: config[key].initialValue,
        touched: false,
        dirty: false,
      };
    }
    return state;
  }, []);

  const [formState, setFormState] = useState<FormState<T>>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Extract values, errors, touched, and dirty states
  const values = useMemo(() => {
    const vals = {} as T;
    for (const key of Object.keys(formState) as Array<keyof T>) {
      vals[key] = formState[key].value;
    }
    return vals;
  }, [formState]);

  const errors = useMemo(() => {
    const errs: Partial<Record<keyof T, string>> = {};
    for (const key of Object.keys(formState) as Array<keyof T>) {
      if (formState[key].error) {
        errs[key] = formState[key].error;
      }
    }
    return errs;
  }, [formState]);

  const touched = useMemo(() => {
    const touch: Partial<Record<keyof T, boolean>> = {};
    for (const key of Object.keys(formState) as Array<keyof T>) {
      touch[key] = formState[key].touched;
    }
    return touch;
  }, [formState]);

  const dirty = useMemo(() => {
    const dirt: Partial<Record<keyof T, boolean>> = {};
    for (const key of Object.keys(formState) as Array<keyof T>) {
      dirt[key] = formState[key].dirty;
    }
    return dirt;
  }, [formState]);

  const isDirty = useMemo(() => {
    return Object.values(formState).some((field) => field.dirty);
  }, [formState]);

  const isValid = useMemo(() => {
    return !Object.values(formState).some((field) => field.error);
  }, [formState]);

  // Validate a single field
  const validateField = useCallback(<K extends keyof T>(field: K): boolean => {
    const fieldConfig = config[field];
    const fieldState = formState[field];
    let error: string | undefined;

    // Check required
    if (fieldConfig.required && !fieldState.value) {
      error = 'This field is required';
    }

    // Run custom validation
    if (!error && fieldConfig.validate) {
      error = fieldConfig.validate(fieldState.value);
    }

    // Update state with error
    setFormState((prev) => ({
      ...prev,
      [field]: {
        ...prev[field],
        error,
      },
    }));

    return !error;
  }, [config, formState]);

  // Validate all fields using schema or individual validators
  const validateAll = useCallback((): boolean => {
    let isValidForm = true;

    // If schema is provided, validate entire form
    if (schema) {
      const result = schema.safeParse(values);
      if (!result.success) {
        isValidForm = false;
        const zodErrors: Partial<Record<keyof T, string>> = {};
        for (const err of result.error.errors) {
          const path = err.path[0] as keyof T;
          if (!zodErrors[path]) {
            zodErrors[path] = err.message;
          }
        }

        setFormState((prev) => {
          const newState = { ...prev };
          for (const key of Object.keys(newState) as Array<keyof T>) {
            newState[key] = {
              ...newState[key],
              error: zodErrors[key],
            };
          }
          return newState;
        });
      } else {
        // Clear all errors
        setFormState((prev) => {
          const newState = { ...prev };
          for (const key of Object.keys(newState) as Array<keyof T>) {
            newState[key] = {
              ...newState[key],
              error: undefined,
            };
          }
          return newState;
        });
      }
    } else {
      // Validate each field individually
      for (const key of Object.keys(config) as Array<keyof T>) {
        const isFieldValid = validateField(key);
        if (!isFieldValid) {
          isValidForm = false;
        }
      }
    }

    return isValidForm;
  }, [config, schema, values, validateField]);

  // Set field value
  const setValue = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setFormState((prev) => {
      const newState = {
        ...prev,
        [field]: {
          ...prev[field],
          value,
          dirty: true,
          error: undefined, // Clear error on change
        },
      };
      return newState;
    });

    // Validate on change if enabled
    if (validateOnChange) {
      // Use setTimeout to validate after state update
      setTimeout(() => {
        validateField(field);
      }, 0);
    }
  }, [validateOnChange, validateField]);

  // Set field error manually
  const setError = useCallback(<K extends keyof T>(field: K, error: string | undefined) => {
    setFormState((prev) => ({
      ...prev,
      [field]: {
        ...prev[field],
        error,
      },
    }));
  }, []);

  // Clear field error
  const clearError = useCallback(<K extends keyof T>(field: K) => {
    setFormState((prev) => ({
      ...prev,
      [field]: {
        ...prev[field],
        error: undefined,
      },
    }));
  }, []);

  // Mark field as touched
  const touchField = useCallback(<K extends keyof T>(field: K) => {
    setFormState((prev) => ({
      ...prev,
      [field]: {
        ...prev[field],
        touched: true,
      },
    }));

    // Validate on blur if enabled
    if (validateOnBlur) {
      validateField(field);
    }
  }, [validateOnBlur, validateField]);

  // Reset form to initial state or new values
  const reset = useCallback((newValues?: Partial<T>) => {
    setFormState((prev) => {
      const newState = { ...prev };
      for (const key of Object.keys(config) as Array<keyof T>) {
        newState[key] = {
          value: newValues?.[key] ?? config[key].initialValue,
          touched: false,
          dirty: false,
          error: undefined,
        };
      }
      return newState;
    });
  }, [config]);

  // Handle form submission
  const handleSubmit = useCallback(async (e?: { preventDefault?: () => void }) => {
    e?.preventDefault?.();

    // Mark all fields as touched
    setFormState((prev) => {
      const newState = { ...prev };
      for (const key of Object.keys(newState) as Array<keyof T>) {
        newState[key] = {
          ...newState[key],
          touched: true,
        };
      }
      return newState;
    });

    // Validate all fields
    const isFormValid = validateAll();

    if (!isFormValid) {
      onError?.(errors as Record<string, string>);
      return;
    }

    if (onSubmit) {
      setIsSubmitting(true);
      try {
        await onSubmit(values);
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [validateAll, values, onSubmit, onError, errors]);

  // Get field props for input components
  const getFieldProps = useCallback(<K extends keyof T>(field: K) => {
    return {
      value: formState[field].value,
      onChange: (value: T[K]) => setValue(field, value),
      onBlur: () => touchField(field),
      error: formState[field].error,
    };
  }, [formState, setValue, touchField]);

  return {
    values,
    errors,
    touched,
    dirty,
    isValid,
    isSubmitting,
    isDirty,
    setValue,
    setError,
    clearError,
    touchField,
    reset,
    validateField,
    validateAll,
    handleSubmit,
    getFieldProps,
  };
}

/**
 * Zod schema resolver for useForm
 * Creates a validate function from a Zod schema
 */
export function zodResolver<T extends Record<string, unknown>>(schema: ZodType<T>) {
  return (values: T): Record<string, string> | undefined => {
    const result = schema.safeParse(values);
    if (result.success) {
      return undefined;
    }

    const errors: Record<string, string> = {};
    for (const error of result.error.errors) {
      const path = error.path.join('.');
      if (!errors[path]) {
        errors[path] = error.message;
      }
    }
    return errors;
  };
}

export default useForm;
