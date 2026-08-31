import { createFileRoute } from "@tanstack/react-router";
import { Oathbound } from "@/components/oathbound";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <Oathbound />;
}
