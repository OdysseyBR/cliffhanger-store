import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Finalize seu pedido: dados, entrega, pagamento e revisão.",
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
