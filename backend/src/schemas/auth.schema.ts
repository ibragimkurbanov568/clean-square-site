/**
 * Zod-схемы регистрации/логина — пример-эталон для остальных модулей (docs/01-spec.md,
 * "Правила и валидация": все входные данные валидируются Zod до записи в D1).
 */
import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Пароль должен содержать минимум 8 символов');

const usernameSchema = z
  .string()
  .min(3, 'Заполните это поле')
  .max(32)
  .regex(/^[a-zA-Z0-9_]+$/, 'Имя пользователя может содержать только латиницу, цифры и "_"');

const innOgrnSchema = z
  .string()
  .regex(/^\d{10,15}$/, 'Проверьте формат ИНН/ОГРН — только цифры, 10–15 знаков');

export const registerClientSchema = z.object({
  email: z.string().email('Заполните это поле'),
  password: passwordSchema,
  username: usernameSchema,
  city: z.string().min(1, 'Заполните это поле'),
});
export type RegisterClientInput = z.infer<typeof registerClientSchema>;

export const registerCompanySchema = z.object({
  email: z.string().email('Заполните это поле'),
  password: passwordSchema,
  companyUsername: usernameSchema,
  innOgrn: innOgrnSchema,
  city: z.string().min(1, 'Заполните это поле'),
  address: z.string().min(1, 'Заполните это поле'),
  phone: z.string().min(1, 'Заполните это поле'),
  website: z.string().url().optional().or(z.literal('')),
  workHours: z.string().optional(),
});
export type RegisterCompanyInput = z.infer<typeof registerCompanySchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Заполните это поле'),
  rememberMe: z.boolean().optional().default(false),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const login2faSchema = z.object({
  challengeId: z.string(),
  code: z.string().length(6),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  });

export const totpVerifySchema = z.object({
  code: z.string().length(6),
});
