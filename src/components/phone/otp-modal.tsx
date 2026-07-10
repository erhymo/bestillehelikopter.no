"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface OtpModalProps {
  open: boolean;
  onClose: () => void;
  phone: string;
  onSendOtp: (phone: string) => Promise<void>;
  onVerifyOtp: (code: string) => Promise<{ success: boolean }>;
  loading: boolean;
  error: string | null;
  verified: boolean;
}

export function OtpModal({
  open,
  onClose,
  phone,
  onSendOtp,
  onVerifyOtp,
  loading,
  error,
  verified,
}: OtpModalProps) {
  const [step, setStep] = useState<"send" | "verify">("send");
  const [code, setCode] = useState("");

  const handleSend = async () => {
    await onSendOtp(phone);
    setStep("verify");
  };

  const handleVerify = async () => {
    const result = await onVerifyOtp(code);
    if (result.success) {
      onClose();
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Verifiser telefonnummer">
      {verified ? (
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="text-3xl">✅</div>
          <p className="text-sm text-gray-600">
            Telefonnummeret er verifisert!
          </p>
          <Button onClick={onClose}>Lukk</Button>
        </div>
      ) : step === "send" ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Vi sender en engangskode til{" "}
            <span className="font-medium">{phone}</span>
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose} disabled={loading}>
              Avbryt
            </Button>
            <Button onClick={handleSend} loading={loading}>
              Send kode
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Skriv inn koden du mottok på SMS
          </p>
          <Input
            label="Verifiseringskode"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            maxLength={6}
            inputMode="numeric"
            autoFocus
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setStep("send")}
              disabled={loading}
            >
              Send på nytt
            </Button>
            <Button
              onClick={handleVerify}
              loading={loading}
              disabled={code.length < 6}
            >
              Verifiser
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

