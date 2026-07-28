import CadeteClient from "./CadeteClient";

export default async function CadetePage({ params }: PageProps<"/cadete/[accessToken]">) {
  const { accessToken } = await params;
  return <CadeteClient accessToken={accessToken} />;
}
