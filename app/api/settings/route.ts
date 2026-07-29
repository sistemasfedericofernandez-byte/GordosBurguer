import { NextRequest, NextResponse } from "next/server";
import {
  isActivated,
  isExpired,
  TRIAL_DEADLINE,
  checkPin,
  isValidPin,
  setPinHash,
  checkActivationKey,
  getDefaultTariff,
  setDefaultTariff,
  getBusinessInfo,
  setBusinessInfo,
} from "@/lib/auth";

export async function GET() {
  return NextResponse.json({
    activated: await isActivated(),
    expired: await isExpired(),
    trialDeadline: TRIAL_DEADLINE,
    defaultTariff: await getDefaultTariff(),
    businessInfo: await getBusinessInfo(),
  });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();

  if (body.activationKey !== undefined) {
    const ok = await checkActivationKey(body.activationKey);
    if (!ok) return NextResponse.json({ error: "Clave incorrecta." }, { status: 403 });
    return NextResponse.json({ activated: true });
  }

  if (body.currentPin !== undefined || body.newPin !== undefined) {
    if (!(await checkPin(body.currentPin || ""))) {
      return NextResponse.json({ error: "El PIN actual no es correcto." }, { status: 403 });
    }
    if (!isValidPin(body.newPin || "")) {
      return NextResponse.json({ error: "El PIN nuevo debe tener 4 números." }, { status: 400 });
    }
    await setPinHash(body.newPin);
    return NextResponse.json({ ok: true });
  }

  if (body.defaultTariff !== undefined) {
    await setDefaultTariff(parseFloat(body.defaultTariff) || 0);
    return NextResponse.json({ ok: true });
  }

  if (body.businessInfo !== undefined) {
    await setBusinessInfo(body.businessInfo);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Nada para actualizar." }, { status: 400 });
}
