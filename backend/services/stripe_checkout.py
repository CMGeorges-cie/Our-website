"""Stripe Checkout — implémentation interne sur le SDK officiel ``stripe``.

Remplace le package privé ``emergentintegrations.payments.stripe.checkout``
(Emergent), absent de PyPI, qui rendait le backend indéployable hors de la
plateforme Emergent (cause de l'échec du build Render du 2026-10-31).

La surface d'API est identique à celle du module d'origine afin de ne changer
aucun appelant (server.py, routers/public_payment.py) :

  - ``StripeCheckout(api_key=..., webhook_url=...)``
  - ``CheckoutSessionRequest(amount, currency, success_url, cancel_url, metadata)``
    (``amount`` en dollars, comme avant)
  - ``await create_checkout_session(req)`` -> ``CheckoutSessionResponse``
    (``.url``, ``.session_id``)
  - ``await get_checkout_status(session_id)`` -> ``CheckoutStatusResponse``
    (``.status``, ``.payment_status``, ``.amount_total`` en cents, ``.currency``,
    ``.metadata``)
  - ``await handle_webhook(body, sig)`` -> ``CheckoutWebhookResponse``
    (``.event_type``, ``.session_id``, ``.payment_status``, ...)

Webhook : si la variable d'environnement ``STRIPE_WEBHOOK_SECRET`` est
définie, la signature de l'événement est vérifiée via le SDK officiel.
Sinon, l'événement est lu sans vérification (comportement tolérant historique).
Avant la mise en production des paiements : créer l'endpoint webhook dans le
tableau de bord Stripe (URL ``<backend>/api/webhook/stripe``, événement
``checkout.session.completed``) et définir ``STRIPE_WEBHOOK_SECRET``.
"""
from __future__ import annotations

import json
import os
from typing import Any, Dict, Optional

import stripe


class CheckoutSessionRequest:
    """Paramètres d'une session Stripe Checkout (montant en dollars)."""

    def __init__(
        self,
        amount: float = 0.0,
        currency: str = "cad",
        success_url: str = "",
        cancel_url: str = "",
        metadata: Optional[Dict[str, Any]] = None,
        **kwargs: Any,
    ):
        self.amount = amount
        self.currency = currency
        self.success_url = success_url
        self.cancel_url = cancel_url
        self.metadata = metadata or {}
        self.__dict__.update(kwargs)


class CheckoutSessionResponse:
    def __init__(self, url: str = "", session_id: str = "", **kwargs: Any):
        self.url = url
        self.session_id = session_id
        self.__dict__.update(kwargs)


class CheckoutStatusResponse:
    def __init__(
        self,
        status: str = "expired",
        payment_status: str = "unpaid",
        amount_total: int = 0,
        currency: str = "cad",
        metadata: Optional[Dict[str, Any]] = None,
        **kwargs: Any,
    ):
        self.status = status
        self.payment_status = payment_status
        self.amount_total = amount_total
        self.currency = currency
        self.metadata = metadata or {}
        self.__dict__.update(kwargs)


class CheckoutWebhookResponse:
    def __init__(
        self,
        event_type: str = "",
        session_id: str = "",
        payment_status: str = "unpaid",
        amount_total: int = 0,
        currency: str = "cad",
        metadata: Optional[Dict[str, Any]] = None,
        **kwargs: Any,
    ):
        self.event_type = event_type
        self.session_id = session_id
        self.payment_status = payment_status
        self.amount_total = amount_total
        self.currency = currency
        self.metadata = metadata or {}
        self.__dict__.update(kwargs)


class StripeCheckout:
    """Client Stripe Checkout minimal, bâti sur le SDK officiel (async)."""

    def __init__(
        self,
        api_key: str = "",
        webhook_url: str = "",
        webhook_secret: Optional[str] = None,
        **kwargs: Any,
    ):
        self.api_key = api_key
        self.webhook_url = webhook_url
        # Secret de signature webhook : paramètre explicite ou environnement.
        self.webhook_secret = (
            webhook_secret
            if webhook_secret is not None
            else os.environ.get("STRIPE_WEBHOOK_SECRET", "")
        )
        if api_key:
            stripe.api_key = api_key

    async def create_checkout_session(
        self, request: CheckoutSessionRequest
    ) -> CheckoutSessionResponse:
        if self.api_key:
            stripe.api_key = self.api_key
        session = await stripe.checkout.Session.create_async(
            mode="payment",
            line_items=[
                {
                    "price_data": {
                        "currency": (request.currency or "cad").lower(),
                        "product_data": {"name": "Déco Touché"},
                        "unit_amount": int(round(float(request.amount) * 100)),
                    },
                    "quantity": 1,
                }
            ],
            success_url=request.success_url,
            cancel_url=request.cancel_url,
            metadata=request.metadata or {},
        )
        return CheckoutSessionResponse(url=session.url or "", session_id=session.id)

    async def get_checkout_status(self, session_id: str) -> CheckoutStatusResponse:
        if self.api_key:
            stripe.api_key = self.api_key
        session = await stripe.checkout.Session.retrieve_async(session_id)
        return CheckoutStatusResponse(
            status=session.status or "expired",
            payment_status=session.payment_status or "unpaid",
            amount_total=int(session.amount_total or 0),
            currency=session.currency or "cad",
            metadata=dict(session.metadata or {}),
        )

    async def handle_webhook(self, body: bytes, sig: str) -> CheckoutWebhookResponse:
        if self.webhook_secret:
            # Vérification de signature officielle (lève une exception si invalide).
            event = stripe.Webhook.construct_event(body, sig, self.webhook_secret)
            payload = dict(event)
        else:
            # Aucun secret configuré : lecture sans vérification (voir docstring).
            payload = json.loads(body.decode("utf-8") if isinstance(body, bytes) else body)

        event_type = payload.get("type", "")
        obj = (payload.get("data") or {}).get("object") or {}

        session_id = ""
        payment_status = "unpaid"
        if event_type.startswith("checkout.session."):
            session_id = obj.get("id", "")
            payment_status = obj.get("payment_status", "unpaid")
        elif event_type == "payment_intent.succeeded":
            payment_status = "paid"
            session_id = (obj.get("metadata") or {}).get("session_id", "") or obj.get("id", "")

        return CheckoutWebhookResponse(
            event_type=event_type,
            session_id=session_id,
            payment_status=payment_status,
            amount_total=int(obj.get("amount_total") or 0),
            currency=obj.get("currency") or "cad",
            metadata=obj.get("metadata") or {},
        )
