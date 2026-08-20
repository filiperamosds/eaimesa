import { OrdersBoard, STAFF_BOARD_ENDPOINTS } from "../../../../components/orders-board";

export const metadata = { title: "Garçom — Pedidos" };

export default function GarcomPedidosPage() {
  return <OrdersBoard endpoints={STAFF_BOARD_ENDPOINTS} compact />;
}
