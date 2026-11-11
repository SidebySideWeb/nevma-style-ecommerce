import { assertServerOnly, serverEnv } from '../server/env';
import type { Address, Customer, Order, OrderLine } from '../commerce/types';
import type { SessionData } from './session-data';
import { shopDomain } from './auth';

assertServerOnly('account/customer-api');

type GqlResponse<T> = { data?: T; errors?: { message: string }[] };

async function customerGraphql<T>(
  accessToken: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const version = serverEnv('SHOPIFY_API_VERSION') || '2026-10';
  const endpoint = `https://shopify.com/${shopDomain()}/account/customer/api/${version}/graphql`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Customer Account API ${res.status}`);
  const json = (await res.json()) as GqlResponse<T>;
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join('; '));
  if (!json.data) throw new Error('Customer Account API returned no data');
  return json.data;
}

const CUSTOMER_QUERY = `#graphql
  query AccountHome {
    customer {
      id
      firstName
      lastName
      emailAddress { emailAddress }
      defaultAddress { id }
      addresses(first: 20) {
        nodes {
          id
          formatted
          firstName
          lastName
          company
          address1
          address2
          city
          zip
          territoryCode
        }
      }
      orders(first: 20, sortKey: PROCESSED_AT, reverse: true) {
        nodes {
          id
          name
          processedAt
          financialStatus
          fulfillmentStatus
          totalPrice { amount currencyCode }
          totalTax { amount currencyCode }
          shippingAddress { formatted }
          lineItems(first: 20) {
            nodes {
              id
              title
              quantity
              price { amount currencyCode }
              variantTitle
              image { url }
              productId
            }
          }
          fulfillments(first: 5) {
            nodes {
              status
              trackingInformation { number url company }
            }
          }
          metafield(namespace: "nevma", key: "numbers") { value }
        }
      }
    }
  }
`;

type RawAddress = {
  id: string;
  formatted?: string[];
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  zip?: string | null;
  territoryCode?: string | null;
};

type RawOrder = {
  id: string;
  name: string;
  processedAt: string;
  financialStatus?: string | null;
  fulfillmentStatus?: string | null;
  totalPrice?: { amount: string; currencyCode: string } | null;
  totalTax?: { amount: string; currencyCode: string } | null;
  shippingAddress?: { formatted?: string[] } | null;
  lineItems?: {
    nodes: {
      id: string;
      title: string;
      quantity: number;
      price?: { amount: string } | null;
      variantTitle?: string | null;
      image?: { url?: string } | null;
    }[];
  };
  fulfillments?: { nodes: { status?: string; trackingInformation?: { number?: string }[] }[] };
  metafield?: { value?: string } | null;
};

function addressLines(a: RawAddress): string[] {
  if (a.formatted?.length) return a.formatted;
  const name = [a.firstName, a.lastName].filter(Boolean).join(' ');
  const street = [a.address1, a.address2].filter(Boolean).join(', ');
  const cityLine = [a.city, a.zip].filter(Boolean).join(' ');
  return [name, street, cityLine, a.territoryCode === 'GB' ? 'United Kingdom' : a.territoryCode || ''].filter(
    Boolean,
  ) as string[];
}

function parseNumbers(raw: string | undefined | null): Record<string, number> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, number>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function mapOrder(o: RawOrder): Order {
  const numbers = parseNumbers(o.metafield?.value);
  const lines: OrderLine[] = (o.lineItems?.nodes || []).map((li) => {
    const size = (li.variantTitle || '').split(' / ')[0] || li.variantTitle || '';
    return {
      handle: '',
      title: li.title,
      size,
      number: numbers[li.id],
      price: li.price?.amount?.replace(/\.00$/, '') || '0',
    };
  });
  const status =
    o.fulfillmentStatus === 'FULFILLED'
      ? 'Delivered'
      : o.fulfillmentStatus === 'IN_PROGRESS' || o.fulfillmentStatus === 'UNFULFILLED'
        ? 'Being packed'
        : o.fulfillmentStatus || o.financialStatus || '';
  return {
    id: o.id,
    name: o.name,
    processedAt: o.processedAt.slice(0, 10),
    status,
    total: o.totalPrice?.amount,
    tax: o.totalTax?.amount,
    lines,
    delivery: o.shippingAddress?.formatted?.join(', '),
  };
}

export async function fetchCustomer(session: SessionData): Promise<Customer> {
  const data = await customerGraphql<{
    customer: {
      id: string;
      firstName?: string | null;
      lastName?: string | null;
      emailAddress?: { emailAddress?: string } | null;
      defaultAddress?: { id: string } | null;
      addresses: { nodes: RawAddress[] };
      orders: { nodes: RawOrder[] };
    };
  }>(session.accessToken, CUSTOMER_QUERY);

  const c = data.customer;
  const defaultId = c.defaultAddress?.id;
  const addresses: Address[] = c.addresses.nodes.map((a) => ({
    id: a.id,
    default: a.id === defaultId,
    label: a.id === defaultId ? 'Default' : undefined,
    lines: addressLines(a),
  }));

  return {
    id: c.id.replace(/^gid:\/\/shopify\/Customer\//, ''),
    firstName: c.firstName || session.firstName || '',
    lastName: c.lastName || session.lastName || '',
    email: c.emailAddress?.emailAddress || session.email || '',
    addresses,
    orders: c.orders.nodes.map(mapOrder),
  };
}

export async function customerUpdate(
  accessToken: string,
  input: { firstName?: string; lastName?: string },
): Promise<void> {
  await customerGraphql(
    accessToken,
    `#graphql
      mutation CustomerUpdate($input: CustomerUpdateInput!) {
        customerUpdate(input: $input) {
          userErrors { message }
        }
      }
    `,
    { input },
  );
}

export async function customerAddressCreate(
  accessToken: string,
  address: Record<string, string>,
  defaultAddress = false,
): Promise<void> {
  await customerGraphql(
    accessToken,
    `#graphql
      mutation AddressCreate($address: CustomerAddressInput!, $defaultAddress: Boolean) {
        customerAddressCreate(address: $address, defaultAddress: $defaultAddress) {
          userErrors { message }
        }
      }
    `,
    { address, defaultAddress },
  );
}

export async function customerAddressUpdate(
  accessToken: string,
  addressId: string,
  address: Record<string, string>,
  defaultAddress?: boolean,
): Promise<void> {
  await customerGraphql(
    accessToken,
    `#graphql
      mutation AddressUpdate($addressId: ID!, $address: CustomerAddressInput!, $defaultAddress: Boolean) {
        customerAddressUpdate(addressId: $addressId, address: $address, defaultAddress: $defaultAddress) {
          userErrors { message }
        }
      }
    `,
    { addressId, address, defaultAddress },
  );
}

export async function customerAddressDelete(accessToken: string, addressId: string): Promise<void> {
  await customerGraphql(
    accessToken,
    `#graphql
      mutation AddressDelete($addressId: ID!) {
        customerAddressDelete(addressId: $addressId) {
          userErrors { message }
        }
      }
    `,
    { addressId },
  );
}

export async function setEmailMarketingConsent(
  accessToken: string,
  email: string,
  subscribe: boolean,
): Promise<void> {
  await customerGraphql(
    accessToken,
    `#graphql
      mutation EmailMarketing($input: CustomerEmailMarketingSubscribeInput!) {
        customerEmailMarketingSubscribe(input: $input) {
          userErrors { message }
        }
      }
    `,
    {
      input: {
        emailAddress: email,
        emailMarketingState: subscribe ? 'SUBSCRIBED' : 'UNSUBSCRIBED',
      },
    },
  ).catch(async () => {
    /* older schema may use customerEmailMarketingConsentUpdate — ignore if unavailable */
  });
}
