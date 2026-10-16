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
  emergencyAcknowledged: z.boolean().optional(),
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

// (Cart & Checkout schemas are declared in Phase 7 section below)

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
  visitType?: string | null;
  symptoms?: string[];
  reason?: string | null;
  emergencyAcknowledged?: boolean;
  careInstructions?: CareInstructions | null;
  isDemo: boolean;
  cancellationHours: number;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  createdAt: string;
}

export interface VetVisitTypeSummary {
  id: string;
  code: string;
  name: string;
  description: string;
  durationMin: number;
  basePriceCents: number;
  species: Species[];
}

export const EMERGENCY_DISCLAIMER_TEXT =
  'For emergencies (severe trauma, difficulty breathing, collapsed/unconscious, poisoning, acute bloat), contact your nearest emergency veterinary hospital immediately. PawNest visits are for scheduled, non-emergency care.';

export const STANDARD_VET_VISIT_TYPES: VetVisitTypeSummary[] = [
  {
    id: 'vt-wellness',
    code: 'WELLNESS',
    name: 'Wellness & Preventive Exam',
    description: 'Comprehensive physical examination, vitals, dental check, coat health, and nutrition consultation.',
    durationMin: 30,
    basePriceCents: 8500,
    species: [Species.DOG, Species.CAT],
  },
  {
    id: 'vt-vaccination',
    code: 'VACCINATION',
    name: 'Vaccination & Immunity Assessment',
    description: 'Administration of core rabies and lifestyle booster vaccines with a pre-vaccine health screen.',
    durationMin: 20,
    basePriceCents: 6500,
    species: [Species.DOG, Species.CAT],
  },
  {
    id: 'vt-sick',
    code: 'SICK_VISIT',
    name: 'Comprehensive Sick Pet Consultation',
    description: 'Detailed evaluation of acute symptoms: digestive upset, lethargy, skin lesions, respiratory, or mobility changes.',
    durationMin: 45,
    basePriceCents: 11000,
    species: [Species.DOG, Species.CAT],
  },
  {
    id: 'vt-dental',
    code: 'DENTAL',
    name: 'Comprehensive Dental Examination',
    description: 'Oral cavity staging, gingivitis assessment, calculus evaluation, and dental prophylaxis recommendations.',
    durationMin: 30,
    basePriceCents: 9500,
    species: [Species.DOG, Species.CAT],
  },
  {
    id: 'vt-followup',
    code: 'FOLLOW_UP',
    name: 'Post-Treatment Follow-up & Progress Check',
    description: 'Re-evaluation of ongoing treatment response, wound check, suture removal, or medication adjustments.',
    durationMin: 20,
    basePriceCents: 4500,
    species: [Species.DOG, Species.CAT],
  },
];

export const VET_SYMPTOM_OPTIONS: Record<Species, string[]> = {
  [Species.DOG]: [
    'Lethargy / low energy',
    'Vomiting or nausea',
    'Decreased appetite / weight loss',
    'Coughing, wheezing, or nasal discharge',
    'Limping or stiffness walking',
    'Skin itching, scratching, or redness',
    'Ear scratching, shaking, or odor',
    'Eye redness, squinting, or discharge',
    'Diarrhea or loose stool',
    'Urinary straining or frequency',
  ],
  [Species.CAT]: [
    'Lethargy or hiding away',
    'Appetite loss or refusal to eat',
    'Frequent vomiting or hairballs',
    'Urinary straining, frequent litter box visits, or accidents',
    'Sneezing, nasal discharge, or noisy breathing',
    'Excessive grooming, bald patches, or scabs',
    'Weight loss or unkempt coat',
    'Limping or reluctance to jump',
    'Unusual vocalisation or aggression',
  ],
  [Species.OTHER]: [
    'Lethargy / low energy',
    'Loss of appetite',
    'Breathing changes',
    'Digestive changes',
  ],
};

// ==========================================
// PHASE 7: SUPPLIES, CART & COMMERCE
// ==========================================

export const FREE_SHIPPING_THRESHOLD_CENTS = 7500; // $75.00
export const STANDARD_SHIPPING_CENTS = 1000; // $10.00
export const ESTIMATED_TAX_RATE = 0.08875; // 8.875% NYC sales tax
export const STOCK_RESERVATION_TTL_MINUTES = 15;

export const ProductSortOption = {
  NEWEST: 'newest',
  PRICE_ASC: 'price_asc',
  PRICE_DESC: 'price_desc',
  RATING: 'rating',
} as const;
export type ProductSortOption = (typeof ProductSortOption)[keyof typeof ProductSortOption];

export const ProductFilterSchema = z.object({
  category: z.string().optional(),
  q: z.string().optional(),
  species: z.nativeEnum(Species).optional(),
  lifeStage: z.string().optional(),
  brand: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  inStock: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((val) => (typeof val === 'boolean' ? val : val === 'true'))
    .optional(),
  sort: z.nativeEnum(ProductSortOption).default(ProductSortOption.NEWEST).optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20).optional(),
});
export type ProductFilterInput = z.infer<typeof ProductFilterSchema>;

export const AddToCartSchema = z.object({
  variantId: z.string().min(1, 'Variant ID is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(20, 'Maximum 20 units per item'),
});
export type AddToCartInput = z.infer<typeof AddToCartSchema>;
export const AddCartItemSchema = AddToCartSchema;
export type AddCartItemInput = AddToCartInput;

export const UpdateCartItemSchema = z.object({
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(20, 'Maximum 20 units per item'),
});
export type UpdateCartItemInput = z.infer<typeof UpdateCartItemSchema>;

export const MergeCartSchema = z.object({
  items: z
    .array(
      z.object({
        variantId: z.string().min(1),
        quantity: z.number().int().min(1).max(20),
      })
    )
    .max(50, 'Cannot exceed 50 cart lines'),
});
export type MergeCartInput = z.infer<typeof MergeCartSchema>;

export const ShippingAddressSchema = z.object({
  recipient: z.string().min(2, 'Recipient name is required'),
  line1: z.string().min(3, 'Address line 1 is required'),
  line2: z.string().optional().nullable(),
  city: z.string().min(2, 'City is required'),
  region: z.string().min(2, 'State / Province is required'),
  postalCode: z.string().min(3, 'Postal code is required'),
  country: z.string().length(2, 'Country code must be 2 letters').default('US'),
  phone: z.string().optional().nullable(),
});
export type ShippingAddressInput = z.infer<typeof ShippingAddressSchema>;

export const CheckoutSessionSchema = z.object({
  shippingAddress: ShippingAddressSchema,
  clientExpectedTotalCents: z.number().int().positive('Expected total must be positive').optional(),
  paymentMode: z.nativeEnum(PaymentMode).default(PaymentMode.DEMO).optional(),
});
export type CheckoutSessionInput = z.infer<typeof CheckoutSessionSchema>;

export const ConfirmDemoCheckoutSchema = z.object({
  demoToken: z.string().min(1, 'Demo token is required'),
});
export type ConfirmDemoCheckoutInput = z.infer<typeof ConfirmDemoCheckoutSchema>;

export const AdminUpdateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
  notes: z.string().optional(),
});
export type AdminUpdateOrderStatusInput = z.infer<typeof AdminUpdateOrderStatusSchema>;

export const CreateProductReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(100).optional(),
  body: z.string().min(5).max(1000),
});
export type CreateProductReviewInput = z.infer<typeof CreateProductReviewSchema>;

export interface CategorySummary {
  id: string;
  slug: string;
  name: string;
  parentId?: string | null;
  sortOrder: number;
  imageKey?: string | null;
  productCount?: number;
  children?: CategorySummary[];
}

export interface ProductVariantSummary {
  id: string;
  productId: string;
  sku: string;
  name: string;
  priceCents: number;
  compareAtCents?: number | null;
  currency: string;
  stock: number;
  reserved: number;
  availableStock: number;
  weightGrams?: number | null;
}

export interface ProductListItemSummary {
  id: string;
  slug: string;
  name: string;
  brand: string;
  categoryId: string;
  categorySlug: string;
  categoryName: string;
  species: Species[];
  lifeStage: string[];
  tags: string[];
  imageKeys: string[];
  model3dKey?: string | null;
  ratingAvg: number;
  ratingCount: number;
  minPriceCents: number;
  maxPriceCents: number;
  inStock: boolean;
  isDemo: boolean;
}

export interface ProductDetailSummary {
  id: string;
  slug: string;
  name: string;
  brand: string;
  description: string;
  details?: {
    specs?: Record<string, string>;
    ingredients?: string;
    materials?: string;
    careInstructions?: string;
    deliveryEstimate?: string;
  } | null;
  categoryId: string;
  categorySlug: string;
  categoryName: string;
  species: Species[];
  lifeStage: string[];
  tags: string[];
  imageKeys: string[];
  model3dKey?: string | null;
  ratingAvg: number;
  ratingCount: number;
  isDemo: boolean;
  isActive: boolean;
  variants: ProductVariantSummary[];
}

export interface ProductReviewSummary {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  title?: string | null;
  body: string;
  isSample: boolean;
  createdAt: string;
}

export interface CartItemSummary {
  id: string;
  variantId: string;
  productId: string;
  productSlug: string;
  productName: string;
  variantName: string;
  sku: string;
  unitPriceCents: number;
  quantity: number;
  totalPriceCents: number;
  imageKey?: string | null;
  availableStock: number;
  inStock: boolean;
}

export interface CartSummary {
  id: string;
  items: CartItemSummary[];
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  freeShippingThresholdCents: number;
  qualifiesForFreeShipping: boolean;
  itemCount: number;
}

export interface OrderItemSummary {
  id: string;
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  unitPriceCents: number;
  quantity: number;
  totalPriceCents: number;
}

export interface OrderSummary {
  id: string;
  number: string;
  userId: string;
  status: OrderStatus;
  paymentMode: PaymentMode;
  currency: string;
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  shippingAddress: ShippingAddressInput;
  isDemo: boolean;
  reservationExpiresAt?: string | null;
  placedAt: string;
  paidAt?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
  items: OrderItemSummary[];
}

export interface CheckoutSessionResult {
  orderId: string;
  orderNumber: string;
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  paymentMode: PaymentMode;
  expiresAt: string;
  checkoutUrl?: string;
  demoToken?: string;
}

// ==========================================
// PHASE 8: DASHBOARD, NOTIFICATIONS & REVIEWS
// ==========================================

export const ToggleFavouriteSchema = z.object({
  kind: z.enum([FavouriteKind.PROVIDER, FavouriteKind.PRODUCT]),
  id: z.string().min(1, 'Target ID is required'),
});
export type ToggleFavouriteInput = z.infer<typeof ToggleFavouriteSchema>;

export interface FavouriteSummary {
  id: string;
  kind: FavouriteKind;
  createdAt: string;
  providerId?: string | null;
  productId?: string | null;
  provider?: {
    id: string;
    slug: string;
    type: ProviderType;
    name: string;
    tagline?: string | null;
    addressLine: string;
    city: string;
    ratingAvg: number;
    ratingCount: number;
    imageKeys: string[];
    isDemo: boolean;
  } | null;
  product?: {
    id: string;
    slug: string;
    name: string;
    brand: string;
    minPriceCents: number;
    imageKeys: string[];
    ratingAvg: number;
    ratingCount: number;
    isDemo: boolean;
  } | null;
}

export interface NotificationSummary {
  id: string;
  type: string;
  title: string;
  body: string;
  linkUrl?: string | null;
  readAt?: string | null;
  createdAt: string;
}

export interface NotificationListResponse {
  items: NotificationSummary[];
  unreadCount: number;
  total: number;
}

export const CreateProviderReviewSchema = z.object({
  bookingId: z.string().min(1, 'Booking ID is required'),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(100).optional(),
  body: z.string().max(2000).optional(),
});
export type CreateProviderReviewInput = z.infer<typeof CreateProviderReviewSchema>;

export interface ProviderReviewSummary {
  id: string;
  userId: string;
  userName: string;
  providerId: string;
  bookingId: string;
  rating: number;
  title?: string | null;
  body?: string | null;
  isSample: boolean;
  createdAt: string;
}

export interface EligibleBookingForReview {
  id: string;
  reference: string;
  providerId: string;
  providerName: string;
  providerSlug: string;
  petName: string;
  serviceName?: string | null;
  startsAt: string;
  endsAt: string;
  hasReview: boolean;
}

export const AdminUpdateBookingStatusSchema = z.object({
  status: z.enum([
    BookingStatus.PENDING,
    BookingStatus.CONFIRMED,
    BookingStatus.COMPLETED,
    BookingStatus.CANCELLED,
    BookingStatus.NO_SHOW,
  ]),
  notes: z.string().optional(),
});
export type AdminUpdateBookingStatusInput = z.infer<typeof AdminUpdateBookingStatusSchema>;

export interface TimelineEvent {
  id: string;
  type: 'GROOMING' | 'BOARDING' | 'VET' | 'ORDER';
  title: string;
  subtitle: string;
  date: string;
  status: string;
  statusLabel: string;
  linkUrl: string;
  isUpcoming: boolean;
  badgeVariant: 'default' | 'success' | 'warning' | 'error' | 'outline' | 'demo';
  petName?: string;
  petAvatarKey?: string | null;
  totalCents?: number;
  reference?: string;
}

export interface DashboardSummary {
  user: {
    id: string;
    name: string;
    email: string;
  };
  counts: {
    petsCount: number;
    activeBookingsCount: number;
    completedBookingsCount: number;
    activeOrdersCount: number;
    unreadNotificationsCount: number;
    favouritesCount: number;
  };
  upcomingBookings: Array<{
    id: string;
    reference: string;
    kind: BookingKind;
    status: BookingStatus;
    startsAt: string;
    endsAt: string;
    priceCents: number;
    providerName: string;
    providerSlug: string;
    petName: string;
    petAvatarKey?: string | null;
    serviceName?: string | null;
    boardingUnitName?: string | null;
  }>;
  recentOrders: OrderSummary[];
  pets: PetSummary[];
  recentNotifications: NotificationSummary[];
  timeline: TimelineEvent[];
}

