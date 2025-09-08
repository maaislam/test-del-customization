// // @ts-check
// /** @typedef {import("../generated/api").CartDeliveryOptionsTransformRunInput} In */
// /** @typedef {import("../generated/api").CartDeliveryOptionsTransformRunResult} Out */
// /** @typedef {import("../generated/api").Operation} Operation */

// export function cartDeliveryOptionsTransformRun(input) {
//   const variant = getVariant(input); // e.g., "rd232-v1"
//   console.log('🚀 ~ cartDeliveryOptionsTransformRun ~ variant:', variant);
//   /** @type {Operation[]} */
//   const operations = [];

//   // ---------------- Variant split ----------------
//   if (variant !== 'rd232-v1') {
//     // NON v1: show only *plain* Free Delivery (no economy/standard/express)
//     for (const group of input?.cart?.deliveryGroups ?? []) {
//       for (const option of group?.deliveryOptions ?? []) {
//         const flags = classifyDeliveryTitle(option?.title);
//         // operations.push(renameForDebug(option, { warehouse: 'freeOnly', flags }));
//         if (!flags.isFreePlain) operations.push(hideOption(option));
//       }
//     }
//     return { operations };
//   }

//   // ---------------- rd232-v1 ----------------
//   const precedence = ['oxford', 'durham', 'supplier'];
//   const allowByWarehouse = {
//     oxford: ['isFreeEconomy', 'isNextDay'], // (explicitly hide isFreePlain)
//     durham: ['isFreeEconomy', 'isExpress'], // (explicitly hide isFreePlain)
//     supplier: ['isFreePlain'],
//   };

//   for (const group of input?.cart?.deliveryGroups ?? []) {
//     const warehouse = resolveWarehouseForGroup(group, precedence);
//     const allowList = allowByWarehouse[warehouse];

//     for (const option of group?.deliveryOptions ?? []) {
//       const flags = classifyDeliveryTitle(option?.title);

//       // Always rename for quick visual diagnostics
//       // operations.push(renameForDebug(option, { warehouse, flags }));

//       // ✅ Explicit rule: hide plain "Free Delivery" for Oxford & Durham
//       if ((warehouse === 'oxford' || warehouse === 'durham') && flags.isFreePlain) {
//         operations.push(hideOption(option));
//         continue; // move to next option
//       }

//       // If warehouse resolved, enforce its allowlist; if unknown, keep safe.
//       if (allowList?.length) {
//         const keep = allowList.some((flag) => flags[flag]);
//         if (!keep) operations.push(hideOption(option));
//       }
//     }
//   }

//   return { operations };
// }

// /* ============================== Helpers =================================== */

// function getVariant(input) {
//   return String(input?.cart?.attribute?.value ?? '')
//     .trim()
//     .toLowerCase();
// }

// function normalize(text = '') {
//   return String(text)
//     .toLowerCase()
//     .replace(/[^\p{L}\p{N}]+/gu, ' ') // punctuation/dashes → spaces
//     .replace(/\s+/g, ' ') // collapse spaces
//     .trim();
// }

// /**
//  * Classify a delivery option title into flags we can reason about.
//  * Treat "delivery" ≈ "shipping".
//  */
// function classifyDeliveryTitle(title = '') {
//   const t = normalize(title);

//   const has = (kw) => t.includes(kw);
//   const hasDelivWord = has('delivery') || has('shipping');

//   const isFreeEconomy = has('free') && hasDelivWord && (has('economy') || has('standard'));

//   const isFreePlain = has('free') && hasDelivWord && !has('economy') && !has('standard') && !has('express');

//   const isNextDay = has('next working day') || has('next day') || has('nextday');
//   const isExpress = has('express') && hasDelivWord;

//   return { isFreePlain, isFreeEconomy, isNextDay, isExpress };
// }

// function toNormalizedArray(raw) {
//   if (Array.isArray(raw)) return raw.map(normalize).filter(Boolean);

//   const s = normalize(raw ?? '');
//   if (!s) return [];

//   if (s.startsWith('[') && s.endsWith(']')) {
//     try {
//       const arr = JSON.parse(raw);
//       if (Array.isArray(arr)) return arr.map(normalize).filter(Boolean);
//     } catch {
//       /* ignore and fall through */
//     }
//   }
//   return [s];
// }

// function readWarehouseFromLine(line) {
//   const raw = line?.merchandise?.metafield?.value ?? line?.merchandise?.product?.metafield?.value ?? '';

//   return toNormalizedArray(raw)[0] || '';
// }

// function resolveWarehouseForGroup(group, precedence = []) {
//   const seen = [];
//   for (const line of group?.cartLines ?? []) {
//     const w = readWarehouseFromLine(line);

//     if (w && !seen.includes(w)) seen.push(w);
//   }
//   for (const candidate of precedence) {
//     if (seen.includes(candidate)) return candidate;
//   }
//   return ''; // unknown
// }

// function hideOption(option) {
//   return { deliveryOptionHide: { deliveryOptionHandle: option.handle } };
// }

// @ts-check
/** @typedef {import("../generated/api").CartDeliveryOptionsTransformRunInput} In */
/** @typedef {import("../generated/api").CartDeliveryOptionsTransformRunResult} Out */
/** @typedef {import("../generated/api").Operation} Operation */

export function cartDeliveryOptionsTransformRun(/** @type {In} */ input) {
  const variant = getVariant(input); // e.g., "rd232-v1"
  console.log('🚀 cartDeliveryOptionsTransformRun variant:', variant);

  /** @type {Operation[]} */
  const operations = [];

  // ---------------- Variant split ----------------
  for (const group of input?.cart?.deliveryGroups ?? []) {
    for (const option of group?.deliveryOptions ?? []) {
      const flags = classifyTitle(option?.title ?? '');

      if (variant !== 'rd232-v1') {
        // CONTROL: show ONLY "Free Shipping" or "Free Delivery"
        const keep = flags.isFreeShippingPlain || flags.isFreeDeliveryPlain;
        if (!keep) operations.push(hideOption(option));
        continue;
      }

      // VARIATION (rd232-v1): hide ONLY "Free Delivery"
      if (flags.isFreeDeliveryPlain) {
        operations.push(hideOption(option));
        continue;
      }

      // All other options are kept as-is in v1 (Free Shipping, Free Economy, Express, Next Working Day, etc.)
    }
  }

  return { operations };
}

/* ============================== Helpers =================================== */

function getVariant(input) {
  return String(input?.cart?.attribute?.value ?? '')
    .trim()
    .toLowerCase();
}

function normalize(text = '') {
  return String(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Classify by *name only* (per screenshot rules).
 */
function classifyTitle(title = '') {
  const t = normalize(title);
  const has = (kw) => t.includes(kw);

  const hasDelivery = has('delivery');
  const hasShipping = has('shipping');

  const isFree = has('free');
  const isEconomyOrStandard = has('economy') || has('standard');
  const isExpress = has('express') && (hasDelivery || hasShipping);
  const isNextDay = has('next working day') || has('next day') || has('nextday');

  // Distinguish "Free Shipping" vs "Free Delivery" (plain)
  const isFreeShippingPlain = isFree && hasShipping && !isEconomyOrStandard && !isExpress && !isNextDay;

  const isFreeDeliveryPlain = isFree && hasDelivery && !isEconomyOrStandard && !isExpress && !isNextDay;

  const isFreeEconomy = isFree && hasDelivery && isEconomyOrStandard && !isExpress;

  return {
    isFreeShippingPlain,
    isFreeDeliveryPlain,
    isFreeEconomy,
    isExpress,
    isNextDay,
  };
}

function hideOption(option) {
  return { deliveryOptionHide: { deliveryOptionHandle: option.handle } };
}
