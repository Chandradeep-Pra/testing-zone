export type CatalogItem = {
  id: string;
  title: string;
  [key: string]: unknown;
};

export type PricingCatalog = {
  courses: CatalogItem[];
  chapters: CatalogItem[];
  chapterGroups: CatalogItem[];
  videoSections: CatalogItem[];
  videos: CatalogItem[];
  quizzes: CatalogItem[];
  mocks: CatalogItem[];
  vivaCases: CatalogItem[];
  vivaFolders: CatalogItem[];
};

export type PricingPlanVersion = {
  id: string;
  months: number;
  price: number;
  originalPrice: number;
  discountedPrice: number;
  couponId: string;
  couponCode: string;
  embeddedLink: string;
  durationLabel: string;
  billingLabel: string;
};

export type PricingPlan = {
  id: string;
  name: string;
  description: string;
  tag?: string;
  category?: string;
  price: number;
  originalPrice: number;
  discountedPrice: number;
  currency: "GBP";
  versions: PricingPlanVersion[];
  expiryMonths: number;
  durationLabel: string;
  billingLabel: string;
  availabilityNote: string;
  featureBullets: string[];
  embeddedLink: string;
  isActive: boolean;
  sortOrder: number;
  categorySortOrder?: number;
  vivaMinutes: number;
  couponId: string;
  couponCode: string;
  eligibleCouponIds: string[];
  marketingCouponId: string;
  selectedContent: {
    chapterIds: string[];
    videoIds: string[];
    quizIds: string[];
    mockIds: string[];
    vivaCaseIds: string[];
  };
  accessScopes: {
    courseIds: string[];
    chapterGroupIds: string[];
    videoSectionIds: string[];
    vivaFolderIds: string[];
  };
  contentCounts: {
    chapters: number;
    videos: number;
    quizzes: number;
    mocks: number;
    vivaCases: number;
    total: number;
  };
};

export type PricingCoupon = {
  id: string;
  code: string;
  description?: string;
  discountType: "percent" | "amount";
  discountValue: number;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive: boolean;
  isSecret?: boolean;
  allowedPlanIds?: string[];
};

export type PricingPlanWaitlistResponse = {
  id: string;
  planId: string;
  planName: string;
  name: string;
  email: string;
  institution: string;
  createdAt: string | null;
};

export type PricingResponse = {
  plans: PricingPlan[];
  coupons: PricingCoupon[];
  catalog: PricingCatalog;
  waitlistResponses: PricingPlanWaitlistResponse[];
};
