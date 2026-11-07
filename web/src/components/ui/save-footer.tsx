/*
 * Copyright (c) 2025-2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { Button } from "@/components/ui/button"
import { CardFooter } from "@/components/ui/card"
import { RabbitSpinner } from "@/components/ui/RabbitSpinner"

interface SaveFooterProps {
  pending: boolean
  onSave: () => void
  label: string
}

export function SaveFooter({ pending, onSave, label }: SaveFooterProps) {
  return (
    <CardFooter className="flex justify-end">
      <Button className="min-h-11 md:min-h-9" onClick={onSave} disabled={pending}>
        {pending && <RabbitSpinner className="mr-2 size-4" />}
        {label}
      </Button>
    </CardFooter>
  )
}
