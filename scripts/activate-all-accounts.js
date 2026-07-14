const { URLSearchParams } = require("url");

const SUPABASE_URL = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing Supabase service credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.");
    process.exit(1);
}

const PACKAGE_OPTIONS = [
    { plan: "Trial", fee: 0, status: "Trial" },
    { plan: "Starter", fee: 50000, status: "Active" },
    { plan: "Professional", fee: 120000, status: "Active" },
    { plan: "Enterprise", fee: 500000, status: "Active" },
];

const DEFAULT_PLAN = PACKAGE_OPTIONS.find((option) => option.plan === "Starter");
const TODAY = isoDate(new Date());
const RENEWAL_DATE = addMonths(TODAY, 1);

async function main() {
    console.log("Fetching landlord users...");
    const landlords = await fetchAll("/rest/v1/app_users?role=eq.landlord&select=id,email,account_status");
    console.log(`Found ${landlords.length} landlord users.`);

    console.log("Fetching subscriptions...");
    const subscriptions = await fetchAll("/rest/v1/subscriptions?select=*");
    console.log(`Found ${subscriptions.length} subscription records.`);

    const updates = [];
    const creations = [];
    const results = [];

    for (const landlord of landlords) {
        const subscription = subscriptions.find((item) => item.owner_id === landlord.id);
        const shouldUpdateAccountStatus = landlord.account_status !== "Active";
        const planIsTrial = !subscription || String(subscription.plan || "").trim() === "Trial" || Number(subscription.monthly_fee || 0) <= 0;
        const activePlan = subscription && subscription.plan && subscription.plan !== "Trial" && Number(subscription.monthly_fee || 0) > 0 ? subscription.plan : DEFAULT_PLAN.plan;
        const monthlyFee = subscription && Number(subscription.monthly_fee || 0) > 0 ? Number(subscription.monthly_fee) : DEFAULT_PLAN.fee;
        const nextBillingDate = subscription && subscription.next_billing_date && new Date(`${subscription.next_billing_date}T00:00:00`) > new Date(TODAY + "T00:00:00") ? subscription.next_billing_date : RENEWAL_DATE;
        const subscriptionPatch = {
            owner_id: landlord.id,
            plan: activePlan,
            monthly_fee: monthlyFee,
            status: "Active",
            last_payment_date: TODAY,
            last_payment_method: "Manual",
            last_payment_note: "Activated and renewed by bulk admin script.",
            next_billing_date: nextBillingDate,
            provider_payment_status: "Manual",
            provider_next_action: "",
        };

        if (subscription) {
            const shouldPatchSubscription =
                String(subscription.status || "").trim() !== "Active" ||
                String(subscription.plan || "").trim() === "Trial" ||
                Number(subscription.monthly_fee || 0) <= 0 ||
                !subscription.next_billing_date ||
                new Date(`${subscription.next_billing_date}T00:00:00`) <= new Date(TODAY + "T00:00:00");

            if (shouldPatchSubscription) {
                updates.push({ id: subscription.id, patch: subscriptionPatch });
            }
        } else {
            creations.push({ id: `subscription-${Date.now()}-${Math.random().toString(16).slice(2)}`, ...subscriptionPatch });
        }

        if (shouldUpdateAccountStatus) {
            updates.push({ userId: landlord.id, userPatch: { account_status: "Active" } });
        }

        results.push({ landlordId: landlord.id, email: landlord.email || null, subscriptionId: subscription?.id || null, plan: activePlan, renewed: Boolean(shouldPatchSubscription || !subscription), activated: shouldUpdateAccountStatus });
    }

    console.log(`Prepared ${updates.filter((item) => item.id).length} subscription updates and ${creations.length} subscription creations.`);
    console.log(`Prepared ${updates.filter((item) => item.userId).length} account status updates.`);

    for (const update of updates) {
        if (update.id) {
            await patch(`/rest/v1/subscriptions?id=eq.${encodeURIComponent(update.id)}`, update.patch);
            console.log(`Updated subscription ${update.id}`);
            continue;
        }
        if (update.userId) {
            await patch(`/rest/v1/app_users?id=eq.${encodeURIComponent(update.userId)}`, update.userPatch);
            console.log(`Activated landlord ${update.userId}`);
        }
    }

    if (creations.length) {
        await post(`/rest/v1/subscriptions`, creations);
        console.log(`Created ${creations.length} new subscriptions.`);
    }

    console.log("Bulk activation complete. Summary:");
    const summary = {
        landlords: landlords.length,
        subscription_records: subscriptions.length,
        activated_accounts: results.filter((item) => item.activated).length,
        renewed_subscriptions: results.filter((item) => item.renewed).length,
        created_subscriptions: creations.length,
    };
    console.log(JSON.stringify(summary, null, 2));
}

async function fetchAll(path) {
    const rows = [];
    let rangeStart = 0;
    const pageSize = 500;

    while (true) {
        const rangeEnd = rangeStart + pageSize - 1;
        const result = await get(path, { range: `${rangeStart}-${rangeEnd}` });
        if (!Array.isArray(result)) break;
        rows.push(...result);
        if (result.length < pageSize) break;
        rangeStart += pageSize;
    }

    return rows;
}

async function get(path, options = {}) {
    const url = new URL(`${SUPABASE_URL}${path}`);
    const headers = defaultHeaders();
    if (options.range) headers.Range = options.range;
    const response = await fetch(url.toString(), { method: "GET", headers });
    return parseResponse(response);
}

async function post(path, body) {
    const response = await fetch(`${SUPABASE_URL}${path}`, {
        method: "POST",
        headers: defaultHeaders(),
        body: JSON.stringify(Array.isArray(body) ? body : body),
    });
    return parseResponse(response);
}

async function patch(path, body) {
    const response = await fetch(`${SUPABASE_URL}${path}`, {
        method: "PATCH",
        headers: { ...defaultHeaders(), Prefer: "return=representation" },
        body: JSON.stringify(body),
    });
    return parseResponse(response);
}

function defaultHeaders() {
    return {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
    };
}

async function parseResponse(response) {
    const text = await response.text();
    const payload = text ? JSON.parse(text) : null;
    if (!response.ok) {
        console.error(`Supabase request failed: ${response.status} ${response.statusText}`);
        console.error(payload);
        throw new Error(`Supabase request failed: ${response.status}`);
    }
    return payload;
}

function isoDate(date) {
    const d = date instanceof Date ? date : new Date(date);
    return d.toISOString().slice(0, 10);
}

function addMonths(dateString, count) {
    const date = new Date(`${dateString}T00:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + count);
    return isoDate(date);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
