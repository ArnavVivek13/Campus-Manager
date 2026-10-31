import { createFileRoute } from "@tanstack/react-router";
import CampusManager from "@/components/CampusManager";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CIT Campus Manager | Semester 2027" },
      { name: "description", content: "Clash-free campus scheduling and venue management for Chilika Institute of Technology." },
      { property: "og:title", content: "CIT Campus Manager | Semester 2027" },
      { property: "og:description", content: "Clash-free campus scheduling and venue management for Chilika Institute of Technology." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CampusManager,
});
