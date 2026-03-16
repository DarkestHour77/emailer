export interface Contact {
  id: number;
  username: string;
  email: string;
  online: string;
  first_name: string | null;
  last_name: string | null;
  mobile: string | null;
  subscribed: 'Yes' | 'No';
  plan: 'Free Trial' | 'Plus';
  pages_left: number;
  last_login: string | null;
  draft_used: number;
  research_used: number;
  contract_review: number;
  query_count: number;
  judgment_details: number;
  cart_item: string | null;
  created_at: string;
  updated_at: string;
}

export interface Template {
  id: number;
  name: string;
  subject: string;
  body_html: string;
  body_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface Email {
  id: number;
  template_id: number | null;
  subject: string;
  body_html: string;
  sender_email: string;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
  recipientCount: number;
  openRate: number;
  clickRate: number;
}

export interface EmailDetail extends Email {
  recipients: {
    name: string;
    email: string;
    tracking_id: string;
    opened_at: string | null;
    open_count: number;
    clicked_at: string | null;
    click_count: number;
  }[];
}

export interface ContactsResponse {
  data: Contact[];
  total: number;
  page: number;
  limit: number;
}

export interface FilterOptions {
  plans: string[];
  subscribedValues: string[];
}
