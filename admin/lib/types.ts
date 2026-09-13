export interface Plan {
  id: string;
  name: string;
  priceCents: number;
  currency: string;
  bandwidthLimit: number;
  features: string[];
  active: boolean;
  discountPercent: number;
}

export interface Coupon {
  code: string;
  percentOff: number;
  amountOffCents: number;
  maxRedemptions: number;
  redeemedCount: number;
  active: boolean;
  expiresAt?: string;
}

export interface DayView {
  day: string;
  human: number;
  bot: number;
}

export interface Overview {
  users: { total: number; paid: number; free: number; verified: number; anonymous: number; conversionRate: number };
  tunnels: { active: number };
  traffic: { totalRequests: number; bytesIn: number; bytesOut: number };
  viewers: { human: number; bot: number; total: number; byDay: DayView[] };
  plans: Plan[];
  coupons: Coupon[];
  recentUsers: { id: string; subdomain?: string; plan: string; createdAt: string }[];
}

export interface Me {
  enabled: boolean;
  email: string;
  isAdmin: boolean;
}
