import { z } from 'zod';

/** Общие сообщения по docs/02-ux.md — тексты воспроизведены дословно. */
const REQUIRED_MESSAGE = 'Заполните это поле';
const PASSWORD_MIN_MESSAGE = 'Пароль должен содержать минимум 8 символов';

export const loginSchema = z.object({
  email: z.string().min(1, REQUIRED_MESSAGE).email('Введите корректный email'),
  password: z.string().min(1, REQUIRED_MESSAGE),
  rememberMe: z.boolean().optional(),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

export const twoFaSchema = z.object({
  code: z
    .string()
    .min(1, REQUIRED_MESSAGE)
    .regex(/^\d{6}$/, 'Код должен состоять из 6 цифр'),
});
export type TwoFaFormValues = z.infer<typeof twoFaSchema>;

export const registerClientSchema = z.object({
  email: z.string().min(1, REQUIRED_MESSAGE).email('Введите корректный email'),
  password: z.string().min(8, PASSWORD_MIN_MESSAGE),
  username: z.string().min(1, REQUIRED_MESSAGE).min(3, 'Минимум 3 символа'),
  city: z.string().min(1, REQUIRED_MESSAGE),
});
export type RegisterClientFormValues = z.infer<typeof registerClientSchema>;

export const registerCompanySchema = z.object({
  email: z.string().min(1, REQUIRED_MESSAGE).email('Введите корректный email'),
  password: z.string().min(8, PASSWORD_MIN_MESSAGE),
  companyUsername: z.string().min(1, REQUIRED_MESSAGE).min(3, 'Минимум 3 символа'),
  innOgrn: z
    .string()
    .min(1, REQUIRED_MESSAGE)
    .regex(/^\d{10,15}$/, 'Проверьте формат ИНН/ОГРН — только цифры, 10–15 знаков'),
  city: z.string().min(1, REQUIRED_MESSAGE),
  address: z.string().min(1, REQUIRED_MESSAGE),
  phone: z.string().min(1, REQUIRED_MESSAGE),
  website: z.string().optional().or(z.literal('')),
  workHours: z.string().optional().or(z.literal('')),
});
export type RegisterCompanyFormValues = z.infer<typeof registerCompanySchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, REQUIRED_MESSAGE).email('Введите корректный email'),
});
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, PASSWORD_MIN_MESSAGE),
    confirmPassword: z.string().min(1, REQUIRED_MESSAGE),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  });
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export const reviewSchema = z.object({
  rating: z.number().min(1, 'Поставьте оценку от 1 до 5 звёзд').max(5),
  text: z.string().optional(),
});
export type ReviewFormValues = z.infer<typeof reviewSchema>;

export const serviceSchema = z.object({
  name: z.string().min(1, REQUIRED_MESSAGE),
  price: z.coerce.number({ message: REQUIRED_MESSAGE }).positive('Цена должна быть больше 0'),
  durationMin: z.coerce.number().positive().optional().or(z.literal(undefined)),
  description: z.string().optional(),
});
export type ServiceFormValues = z.infer<typeof serviceSchema>;

export const promotionSchema = z.object({
  title: z.string().min(1, REQUIRED_MESSAGE),
  discountPercent: z.coerce
    .number({ message: REQUIRED_MESSAGE })
    .int('Целое число от 1 до 100')
    .min(1, 'Скидка от 1 до 100%')
    .max(100, 'Скидка от 1 до 100%'),
  validUntil: z.string().min(1, REQUIRED_MESSAGE),
});
export type PromotionFormValues = z.infer<typeof promotionSchema>;

export const companyProfileSchema = z.object({
  name: z.string().min(1, REQUIRED_MESSAGE),
  description: z.string().optional(),
  city: z.string().min(1, REQUIRED_MESSAGE),
  address: z.string().min(1, REQUIRED_MESSAGE),
  phone: z.string().min(1, REQUIRED_MESSAGE),
  website: z.string().optional(),
  workHours: z.string().optional(),
  videoUrl: z.string().optional(),
});
export type CompanyProfileFormValues = z.infer<typeof companyProfileSchema>;

/** Извлекает первое сообщение об ошибке для поля из ZodError (zod v4). */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_root';
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}
