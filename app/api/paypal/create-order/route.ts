import { forwardPayPalPayment } from "@/lib/paypalPaymentProxy";
export const POST = (req: Request) => forwardPayPalPayment(req, "create-order");
