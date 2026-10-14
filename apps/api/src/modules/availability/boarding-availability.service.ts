import { prisma } from '../../lib/prisma.js';
import { BoardingUnitAvailability, BookingStatus } from '@pawnest/shared';
import { NotFoundError, ValidationError } from '../../lib/errors.js';

export interface ComputeBoardingAvailabilityOptions {
  providerId: string;
  checkInDateStr: string;  // YYYY-MM-DD
  checkOutDateStr: string; // YYYY-MM-DD
  petCount?: number;
  currentTime?: Date;
}

/**
 * Returns formatted YYYY-MM-DD in the specified timezone.
 */
export function formatDateInTimezone(date: Date, timeZone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date); // en-CA gives YYYY-MM-DD
  } catch {
    return date.toISOString().split('T')[0];
  }
}

/**
 * Generates an array of date strings [startDateStr, ..., endDateStr - 1 day]
 */
export function getStayNightDates(checkInStr: string, checkOutStr: string): string[] {
  const dates: string[] = [];
  const current = new Date(`${checkInStr}T12:00:00Z`);
  const end = new Date(`${checkOutStr}T12:00:00Z`);

  while (current < end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

export class BoardingAvailabilityService {
  async computeAvailability(
    options: ComputeBoardingAvailabilityOptions
  ): Promise<BoardingUnitAvailability[]> {
    const {
      providerId,
      checkInDateStr,
      checkOutDateStr,
      petCount = 1,
      currentTime = new Date(),
    } = options;

    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      include: {
        units: true,
      },
    });

    if (!provider || !provider.isActive) {
      throw new NotFoundError('Provider not found or inactive');
    }

    const timeZone = provider.timezone || 'America/New_York';

    // 1. Date format validation
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(checkInDateStr) || !dateRegex.test(checkOutDateStr)) {
      throw new ValidationError('Dates must be in YYYY-MM-DD format');
    }

    if (checkOutDateStr <= checkInDateStr) {
      throw new ValidationError('Check-out date must be strictly after check-in date');
    }

    // 2. Lead time validation: boarding check-in must be at least tomorrow in provider timezone
    const todayInTz = formatDateInTimezone(currentTime, timeZone);
    if (checkInDateStr <= todayInTz) {
      throw new ValidationError('Boarding check-in must be booked at least one day in advance');
    }

    // 3. Generate all nights in the stay: [checkIn, checkOut)
    const nights = getStayNightDates(checkInDateStr, checkOutDateStr);
    if (nights.length === 0) {
      throw new ValidationError('Stay must be at least 1 night');
    }
    if (nights.length > 30) {
      throw new ValidationError('Maximum stay duration is 30 nights in v1');
    }

    // 4. Fetch all active boarding bookings for this provider in the stay range
    // A booking overlaps with the stay if startsAt < checkOut and endsAt > checkIn
    const stayStartUtc = new Date(`${checkInDateStr}T00:00:00Z`);
    const stayEndUtc = new Date(`${checkOutDateStr}T23:59:59Z`);

    const existingBookings = await prisma.booking.findMany({
      where: {
        providerId,
        kind: 'BOARDING',
        status: { not: BookingStatus.CANCELLED },
        startsAt: { lt: stayEndUtc },
        endsAt: { gt: stayStartUtc },
      },
      select: {
        id: true,
        boardingUnitId: true,
        startsAt: true,
        endsAt: true,
      },
    });

    // 5. For each unit, compute availability for every night
    const result: BoardingUnitAvailability[] = [];

    for (const unit of provider.units) {
      const remainingPerNight: Record<string, number> = {};

      for (const nightDateStr of nights) {
        // Count bookings for this unit occupying this night
        const occupiedCount = existingBookings.filter((b) => {
          if (b.boardingUnitId !== unit.id) return false;
          const bStartStr = formatDateInTimezone(b.startsAt, timeZone);
          const bEndStr = formatDateInTimezone(b.endsAt, timeZone);
          // Occupies night if booking starts on or before night, and ends after night
          return bStartStr <= nightDateStr && nightDateStr < bEndStr;
        }).length;

        const remaining = Math.max(0, unit.capacity - occupiedCount);
        remainingPerNight[nightDateStr] = remaining;
      }

      const minRemaining = Math.min(...Object.values(remainingPerNight));
      const available = minRemaining >= petCount && petCount <= unit.maxPets;
      const stayNightsCount = nights.length;
      const totalPriceCents = stayNightsCount * unit.nightlyCents;

      result.push({
        unit: {
          id: unit.id,
          providerId: unit.providerId,
          name: unit.name,
          description: unit.description,
          capacity: unit.capacity,
          maxPets: unit.maxPets,
          nightlyCents: unit.nightlyCents,
          currency: unit.currency,
          amenities: unit.amenities,
        },
        available,
        remainingPerNight,
        minRemaining,
        nights: stayNightsCount,
        pricePerNightCents: unit.nightlyCents,
        totalPriceCents,
      });
    }

    return result;
  }
}
