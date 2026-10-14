import { z } from 'zod';

// ==========================================
// ENUMS & CONSTANTS
// ==========================================

export const Role = {
  CUSTOMER: 'CUSTOMER',
  ADMIN: 'ADMIN',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const Species = {
  DOG: 'DOG',
  CAT: 'CAT',
  OTHER: 'OTHER',
} as const;
export type Species = (typeof Species)[keyof typeof Species];

export const PetSex = {
  MALE: 'MALE',
  FEMALE: 'FEMALE',
  UNKNOWN: 'UNKNOWN',
} as const;
export type PetSex = (typeof PetSex)[keyof typeof PetSex];

export const SizeTier = {
  XS: 'XS',
  S: 'S',
  M: 'M',
  L: 'L',
  XL: 'XL',
} as const;
export type SizeTier = (typeof SizeTier)[keyof typeof SizeTier];

export const ProviderType = {
  GROOMER: 'GROOMER',
  BOARDING: 'BOARDING',
  VET_CLINIC: 'VET_CLINIC',
} as const;
export type ProviderType = (typeof ProviderType)[keyof typeof ProviderType];

export const BookingKind = {
  GROOMING: 'GROOMING',
  BOARDING: 'BOARDING',
  VET: 'VET',
} as const;
export type BookingKind = (typeof BookingKind)[keyof typeof BookingKind];

export const BookingStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW',
} as const;
export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];

export const OrderStatus = {
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  DEMO_PLACED: 'DEMO_PLACED',
  PAID: 'PAID',
  PROCESSING: 'PROCESSING',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const PaymentMode = {
  DEMO: 'DEMO',
  STRIPE_TEST: 'STRIPE_TEST',
  STRIPE_LIVE: 'STRIPE_LIVE',
} as const;
export type PaymentMode = (typeof PaymentMode)[keyof typeof PaymentMode];

export const FavouriteKind = {
  PROVIDER: 'PROVIDER',
  PRODUCT: 'PRODUCT',
} as const;
export type FavouriteKind = (typeof FavouriteKind)[keyof typeof FavouriteKind];

export const EmailTokenType = {
  VERIFY_EMAIL: 'VERIFY_EMAIL',
  RESET_PASSWORD: 'RESET_PASSWORD',
} as const;
export type EmailTokenType = (typeof EmailTokenType)[keyof typeof EmailTokenType];

// ==========================================
// ERROR CODES (RFC 7807 problem+json)
// ==========================================

export const ErrorCode = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  SLOT_TAKEN: 'SLOT_TAKEN',
  CART_CHANGED: 'CART_CHANGED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_REUSED: 'TOKEN_REUSED',
  VACCINES_REQUIRED: 'VACCINES_REQUIRED',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export interface ProblemDetail {
  type: string;
  title: string;
  status: number;
  code: ErrorCode | string;
  detail: string;
  errors?: Array<{ field: string; message: string }>;
  requestId?: string;
}

// ==========================================
// AUTH SCHEMAS
// ==========================================

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(10, 'Password must be at least 10 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(10, 'Password must be at least 10 characters'),
});
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(10, 'Password must be at least 10 characters'),
});
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

// ==========================================
// PET SCHEMAS
// ==========================================

export const VaccinationStatus = {
  UP_TO_DATE: 'UP_TO_DATE',
  DUE_SOON: 'DUE_SOON',
  EXPIRED: 'EXPIRED',
} as const;
export type VaccinationStatus = (typeof VaccinationStatus)[keyof typeof VaccinationStatus];

export function deriveSizeTier(weightKg: number | null | undefined): SizeTier | null {
  if (weightKg == null) return null;
  if (weightKg < 5) return SizeTier.XS;
  if (weightKg < 10) return SizeTier.S;
  if (weightKg < 25) return SizeTier.M;
  if (weightKg < 40) return SizeTier.L;
  return SizeTier.XL;
}

export function getVaccineStatus(
  expiresOn: Date | string | null | undefined,
  referenceDate?: Date | number
): VaccinationStatus {
  if (!expiresOn) return VaccinationStatus.UP_TO_DATE;
  const exp = new Date(expiresOn).getTime();
  const now = referenceDate ? new Date(referenceDate).getTime() : Date.now();
  if (exp < now) return VaccinationStatus.EXPIRED;
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  if (exp - now <= thirtyDaysMs) return VaccinationStatus.DUE_SOON;
  return VaccinationStatus.UP_TO_DATE;
}

export const CORE_VACCINES: Record<Species, string[]> = {
  [Species.DOG]: ['Rabies', 'DHPP', 'Bordetella'],
  [Species.CAT]: ['Rabies', 'FVRCP'],
  [Species.OTHER]: [],
};

const VACCINE_ALIASES: Record<string, string[]> = {
  DHPP: ['dhpp', 'dapp', 'da2pp', 'distemper', 'parvovirus'],
  Bordetella: ['bordetella', 'kennel cough'],
  Rabies: ['rabies'],
  FVRCP: ['fvrcp', 'feline distemper'],
};

export interface VaccineCheckResult {
  valid: boolean;
  missingVaccines: string[];
  expiringVaccines: Array<{ name: string; expiresOn: string }>;
}

export function validateBoardingVaccines(
  species: Species,
  vaccinations: Array<{ name: string; expiresOn?: string | Date | null }>,
  checkOutDate: string | Date
): VaccineCheckResult {
  const required = CORE_VACCINES[species] || [];
  const missingVaccines: string[] = [];
  const expiringVaccines: Array<{ name: string; expiresOn: string }> = [];

  const checkOutTime = new Date(checkOutDate).getTime();

  for (const req of required) {
    const aliases = VACCINE_ALIASES[req] || [req.toLowerCase()];
    const match = vaccinations.find((v) => {
      const vName = v.name.toLowerCase().trim();
      return aliases.some((alias) => vName.includes(alias));
    });

    if (!match) {
      missingVaccines.push(req);
    } else if (match.expiresOn) {
      const expiryTime = new Date(match.expiresOn).getTime();
      if (expiryTime < checkOutTime) {
        expiringVaccines.push({
          name: match.name,
          expiresOn: new Date(match.expiresOn).toISOString().split('T')[0],
        });
      }
    }
  }

  return {
    valid: missingVaccines.length === 0 && expiringVaccines.length === 0,
    missingVaccines,
    expiringVaccines,
  };
}

const DateInputSchema = z
  .string()
  .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid date format' });

export const CreatePetSchema = z.object({
  name: z.string().min(1, 'Pet name is required'),
  species: z.nativeEnum(Species),
  breed: z.string().optional().nullable(),
  sex: z.nativeEnum(PetSex).default(PetSex.UNKNOWN),
  birthDate: DateInputSchema.optional().nullable(),
  approxAgeMonths: z.number().int().min(0).max(360).optional().nullable(),
  weightKg: z.number().min(0.1).max(150).optional().nullable(),
  sizeTier: z.nativeEnum(SizeTier).optional().nullable(),
  neutered: z.boolean().optional().nullable(),
  microchipId: z.string().optional().nullable(),
  allergies: z.array(z.string()).default([]),
  conditions: z.array(z.string()).default([]),
  medications: z.array(z.string()).default([]),
  temperament: z.array(z.string()).default([]),
  fears: z.array(z.string()).default([]),
  notes: z.string().optional().nullable(),
  vetClinicName: z.string().optional().nullable(),
  avatarKey: z.string().optional().nullable(),
});
export type CreatePetInput = z.infer<typeof CreatePetSchema>;

export const UpdatePetSchema = CreatePetSchema.partial();
export type UpdatePetInput = z.infer<typeof UpdatePetSchema>;

export const CreateVaccinationSchema = z.object({
  name: z.string().min(1, 'Vaccine name is required'),
  administeredOn: DateInputSchema,
  expiresOn: DateInputSchema.optional().nullable(),
  vetName: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});
export type CreateVaccinationInput = z.infer<typeof CreateVaccinationSchema>;

export const UpdateVaccinationSchema = CreateVaccinationSchema.partial();
export type UpdateVaccinationInput = z.infer<typeof UpdateVaccinationSchema>;

// ==========================================
// PROVIDER & AVAILABILITY
// ==========================================

export const ProviderFilterSchema = z.object({
  type: z.nativeEnum(ProviderType).optional(),
  q: z.string().optional(),
  species: z.nativeEnum(Species).optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  minRating: z.coerce.number().optional(),
  city: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
});
export type ProviderFilterInput = z.infer<typeof ProviderFilterSchema>;

export const AvailabilityQuerySchema = z.object({
  serviceId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  petId: z.string().optional(),
});
export type AvailabilityQueryInput = z.infer<typeof AvailabilityQuerySchema>;

export const BoardingAvailabilityQuerySchema = z.object({
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Check-in must be YYYY-MM-DD'),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Check-out must be YYYY-MM-DD'),
  petCount: z.coerce.number().int().min(1).max(5).default(1),
});
export type BoardingAvailabilityQueryInput = z.infer<typeof BoardingAvailabilityQuerySchema>;

export interface AvailabilitySlot {
  startsAt: string; // ISO UTC
  endsAt: string;   // ISO UTC
  remaining: number;
}

// ==========================================
// BOOKING SCHEMAS
// ==========================================

export const QuoteBookingSchema = z.object({
  petId: z.string().min(1),
  providerId: z.string().min(1),
  kind: z.nativeEnum(BookingKind),
  serviceId: z.string().optional().nullable(),
  boardingUnitId: z.string().optional().nullable(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  addOnIds: z.array(z.string()).default([]),
});
export type QuoteBookingInput = z.infer<typeof QuoteBookingSchema>;

export const CreateBookingSchema = z.object({
  petId: z.string().min(1),
  providerId: z.string().min(1),
  kind: z.nativeEnum(BookingKind),
  serviceId: z.string().optional().nullable(),
  boardingUnitId: z.string().optional().nullable(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  addOnIds: z.array(z.string()).default([]),
  notes: z.string().optional().nullable(),
  visitType: z.string().optional().nullable(),
  symptoms: z.array(z.string()).default([]),
  reason: z.string().optional().nullable(),
  careInstructions: z
    .object({
      feeding: z.string().optional(),
      medications: z.string().optional(),
      behaviour: z.string().optional(),
      emergencyContact: z.string().optional(),
    })
    .optional()
    .nullable(),
});
export type CreateBookingInput = z.infer<typeof CreateBookingSchema>;

export const RescheduleBookingSchema = z.object({
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
});
export type RescheduleBookingInput = z.infer<typeof RescheduleBookingSchema>;

export const CancelBookingSchema = z.object({
  reason: z.string().optional().nullable(),
});
export type CancelBookingInput = z.infer<typeof CancelBookingSchema>;

export const CreateReviewSchema = z.object({
  bookingId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().optional().nullable(),
  body: z.string().optional().nullable(),
});
export type CreateReviewInput = z.infer<typeof CreateReviewSchema>;

// ==========================================
// CART & CHECKOUT SCHEMAS
// ==========================================

export const AddCartItemSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().min(1).max(20),
});
export type AddCartItemInput = z.infer<typeof AddCartItemSchema>;

export const UpdateCartItemSchema = z.object({
  quantity: z.number().int().min(1).max(20),
});
export type UpdateCartItemInput = z.infer<typeof UpdateCartItemSchema>;

export const MergeCartSchema = z.object({
  items: z.array(
    z.object({
      variantId: z.string(),
      quantity: z.number().int().min(1).max(20),
    })
  ).max(50),
});
export type MergeCartInput = z.infer<typeof MergeCartSchema>;

export const ShippingAddressSchema = z.object({
  recipient: z.string().min(2),
  line1: z.string().min(3),
  line2: z.string().optional().nullable(),
  city: z.string().min(2),
  region: z.string().optional().nullable(),
  postalCode: z.string().min(2),
  country: z.string().length(2),
  phone: z.string().optional().nullable(),
});
export type ShippingAddressInput = z.infer<typeof ShippingAddressSchema>;

export const CheckoutSessionSchema = z.object({
  shippingAddress: ShippingAddressSchema,
  paymentMode: z.nativeEnum(PaymentMode).default(PaymentMode.DEMO),
});
export type CheckoutSessionInput = z.infer<typeof CheckoutSessionSchema>;

// ==========================================
// ENTITY DTO INTERFACES
// ==========================================

export interface UserSummary {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: Role;
  reduceMotion: boolean;
  emailVerified: boolean;
}

export interface ProviderSummary {
  id: string;
  slug: string;
  type: ProviderType;
  name: string;
  tagline: string | null;
  description: string;
  addressLine: string;
  city: string;
  region: string | null;
  country: string;
  lat: number;
  lng: number;
  timezone: string;
  phone?: string | null;
  websiteUrl?: string | null;
  speciesAccepted: Species[];
  amenities: string[];
  imageKeys: string[];
  ratingAvg: number;
  ratingCount: number;
  cancellationHours?: number;
  priceFromCents?: number;
  isDemo: boolean;
}

export interface ProductSummary {
  id: string;
  slug: string;
  name: string;
  brand: string;
  description: string;
  categoryName: string;
  species: Species[];
  tags: string[];
  imageKeys: string[];
  minPriceCents: number;
  ratingAvg: number;
  ratingCount: number;
  inStock: boolean;
  isDemo: boolean;
}

export interface VaccinationSummary {
  id: string;
  petId: string;
  name: string;
  administeredOn: string;
  expiresOn: string | null;
  vetName: string | null;
  notes: string | null;
  status: VaccinationStatus;
}

export interface PetSummary {
  id: string;
  userId: string;
  name: string;
  species: Species;
  breed: string | null;
  sex: PetSex;
  birthDate: string | null;
  approxAgeMonths: number | null;
  weightKg: number | null;
  sizeTier: SizeTier | null;
  neutered: boolean | null;
  microchipId: string | null;
  allergies: string[];
  conditions: string[];
  medications: string[];
  temperament: string[];
  fears: string[];
  notes: string | null;
  vetClinicName: string | null;
  avatarKey: string | null;
  avatarUrl: string | null;
  vaccinations: VaccinationSummary[];
  vaccinationStatus: VaccinationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceSummary {
  id: string;
  providerId: string;
  kind: BookingKind;
  name: string;
  description: string | null;
  durationMin: number;
  bufferMin: number;
  basePriceCents: number;
  currency: string;
  sizePricing: Record<string, number> | null;
  species: Species[];
  isAddOn: boolean;
  isActive: boolean;
}

export interface ReviewSummary {
  id: string;
  providerId: string;
  userName: string;
  rating: number;
  title: string | null;
  body: string | null;
  isSample: boolean;
  createdAt: string;
}

export interface BoardingUnitSummary {
  id: string;
  providerId: string;
  name: string;
  description: string | null;
  capacity: number;
  maxPets: number;
  nightlyCents: number;
  currency: string;
  amenities: string[];
}

export interface BoardingUnitAvailability {
  unit: BoardingUnitSummary;
  available: boolean;
  remainingPerNight: Record<string, number>;
  minRemaining: number;
  nights: number;
  pricePerNightCents: number;
  totalPriceCents: number;
}

export interface BookingPriceBreakdown {
  baseCents: number;
  sizeAdjustmentCents?: number;
  nights?: number;
  nightlyCents?: number;
  addOnsCents: number;
  totalCents: number;
  addOns?: Array<{ id: string; name: string; priceCents: number }>;
}

export interface CareInstructions {
  feeding?: string;
  medications?: string;
  behaviour?: string;
  emergencyContact?: string;
}

export interface BookingSummary {
  id: string;
  reference: string;
  userId: string;
  petId: string;
  petName: string;
  petSpecies: Species;
  petSizeTier?: SizeTier | null;
  providerId: string;
  providerName: string;
  providerSlug: string;
  providerAddress: string;
  providerPhone?: string | null;
  serviceId?: string | null;
  serviceName?: string | null;
  boardingUnitId?: string | null;
  boardingUnitName?: string | null;
  kind: BookingKind;
  status: BookingStatus;
  startsAt: string;
  endsAt: string;
  priceCents: number;
  currency: string;
  priceBreakdown: BookingPriceBreakdown;
  addOnIds: string[];
  notes?: string | null;
  careInstructions?: CareInstructions | null;
  isDemo: boolean;
  cancellationHours: number;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  createdAt: string;
}


