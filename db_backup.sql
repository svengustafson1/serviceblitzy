--
-- PostgreSQL database dump
--

-- Dumped from database version 16.8 (Homebrew)
-- Dumped by pg_dump version 16.8 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: auto_mark_old_notifications_as_read(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.auto_mark_old_notifications_as_read() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Mark notifications older than 30 days as read
  UPDATE notifications
  SET is_read = TRUE
  WHERE is_read = FALSE 
    AND created_at < NOW() - INTERVAL '30 days';
  RETURN NULL;
END;
$$;


ALTER FUNCTION public.auto_mark_old_notifications_as_read() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: bids; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bids (
    id integer NOT NULL,
    service_request_id integer NOT NULL,
    provider_id integer NOT NULL,
    price numeric(10,2) NOT NULL,
    estimated_hours numeric(5,2),
    description text,
    ai_recommended boolean DEFAULT false,
    status character varying(50) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.bids OWNER TO postgres;

--
-- Name: bids_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.bids_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bids_id_seq OWNER TO postgres;

--
-- Name: bids_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.bids_id_seq OWNED BY public.bids.id;


--
-- Name: homeowners; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.homeowners (
    id integer NOT NULL,
    user_id integer NOT NULL,
    stripe_customer_id character varying(128),
    billing_address character varying(255),
    payment_method_id character varying(128),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.homeowners OWNER TO postgres;

--
-- Name: homeowners_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.homeowners_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.homeowners_id_seq OWNER TO postgres;

--
-- Name: homeowners_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.homeowners_id_seq OWNED BY public.homeowners.id;


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoices (
    id integer NOT NULL,
    service_request_id integer NOT NULL,
    bid_id integer,
    homeowner_id integer NOT NULL,
    provider_id integer NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    platform_fee numeric(10,2) NOT NULL,
    provider_amount numeric(10,2) NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    due_date date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.invoices OWNER TO postgres;

--
-- Name: invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.invoices_id_seq OWNER TO postgres;

--
-- Name: invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.invoices_id_seq OWNED BY public.invoices.id;


--
-- Name: migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    applied_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.migrations OWNER TO postgres;

--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.migrations_id_seq OWNER TO postgres;

--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    type character varying(50) NOT NULL,
    related_to character varying(50),
    related_id integer,
    is_read boolean DEFAULT false,
    actions jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp without time zone
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payments (
    id integer NOT NULL,
    invoice_id integer NOT NULL,
    homeowner_id integer NOT NULL,
    amount numeric(10,2) NOT NULL,
    payment_method character varying(50),
    stripe_payment_id character varying(128),
    status character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.payments OWNER TO postgres;

--
-- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payments_id_seq OWNER TO postgres;

--
-- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;


--
-- Name: properties; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.properties (
    id integer NOT NULL,
    homeowner_id integer NOT NULL,
    address character varying(255) NOT NULL,
    city character varying(100) NOT NULL,
    state character varying(50) NOT NULL,
    zip_code character varying(20) NOT NULL,
    property_size numeric(10,2),
    property_type character varying(50),
    notes text,
    qr_code_url character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.properties OWNER TO postgres;

--
-- Name: properties_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.properties_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.properties_id_seq OWNER TO postgres;

--
-- Name: properties_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.properties_id_seq OWNED BY public.properties.id;


--
-- Name: refunds; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.refunds (
    id integer NOT NULL,
    payment_id integer,
    stripe_refund_id character varying(100),
    amount numeric(10,2) NOT NULL,
    reason text,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    initiated_by_user_id integer,
    initiated_by_role character varying(20),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.refunds OWNER TO postgres;

--
-- Name: refunds_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.refunds_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.refunds_id_seq OWNER TO postgres;

--
-- Name: refunds_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.refunds_id_seq OWNED BY public.refunds.id;


--
-- Name: service_providers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.service_providers (
    id integer NOT NULL,
    user_id integer NOT NULL,
    company_name character varying(255),
    description text,
    services_offered integer[],
    avg_rating numeric(3,2) DEFAULT 0,
    is_verified boolean DEFAULT false,
    stripe_account_id character varying(128),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.service_providers OWNER TO postgres;

--
-- Name: service_providers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.service_providers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.service_providers_id_seq OWNER TO postgres;

--
-- Name: service_providers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.service_providers_id_seq OWNED BY public.service_providers.id;


--
-- Name: service_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.service_requests (
    id integer NOT NULL,
    homeowner_id integer NOT NULL,
    property_id integer NOT NULL,
    service_id integer NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    description text,
    preferred_date date,
    is_recurring boolean DEFAULT false,
    recurrence_frequency character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.service_requests OWNER TO postgres;

--
-- Name: service_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.service_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.service_requests_id_seq OWNER TO postgres;

--
-- Name: service_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.service_requests_id_seq OWNED BY public.service_requests.id;


--
-- Name: services; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.services (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    category character varying(100),
    base_price numeric(10,2),
    is_recurring boolean DEFAULT false,
    markup_percentage numeric(5,2) DEFAULT 15.00,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.services OWNER TO postgres;

--
-- Name: services_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.services_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.services_id_seq OWNER TO postgres;

--
-- Name: services_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.services_id_seq OWNED BY public.services.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    firebase_uid character varying(128),
    email character varying(255) NOT NULL,
    phone character varying(20),
    first_name character varying(100),
    last_name character varying(100),
    role character varying(20) DEFAULT 'homeowner'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: bids id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bids ALTER COLUMN id SET DEFAULT nextval('public.bids_id_seq'::regclass);


--
-- Name: homeowners id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.homeowners ALTER COLUMN id SET DEFAULT nextval('public.homeowners_id_seq'::regclass);


--
-- Name: invoices id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices ALTER COLUMN id SET DEFAULT nextval('public.invoices_id_seq'::regclass);


--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: payments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


--
-- Name: properties id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.properties ALTER COLUMN id SET DEFAULT nextval('public.properties_id_seq'::regclass);


--
-- Name: refunds id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refunds ALTER COLUMN id SET DEFAULT nextval('public.refunds_id_seq'::regclass);


--
-- Name: service_providers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_providers ALTER COLUMN id SET DEFAULT nextval('public.service_providers_id_seq'::regclass);


--
-- Name: service_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_requests ALTER COLUMN id SET DEFAULT nextval('public.service_requests_id_seq'::regclass);


--
-- Name: services id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.services ALTER COLUMN id SET DEFAULT nextval('public.services_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: bids; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bids (id, service_request_id, provider_id, price, estimated_hours, description, ai_recommended, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: homeowners; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.homeowners (id, user_id, stripe_customer_id, billing_address, payment_method_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.invoices (id, service_request_id, bid_id, homeowner_id, provider_id, total_amount, platform_fee, provider_amount, status, due_date, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.migrations (id, name, applied_at) FROM stdin;
1	add-access-hash.sql	2025-02-25 06:28:19.429325
2	notifications-table.sql	2025-02-25 06:28:19.452053
3	payments-tables.sql	2025-02-25 07:41:42.399129
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, user_id, title, message, type, related_to, related_id, is_read, actions, created_at, updated_at, expires_at) FROM stdin;
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payments (id, invoice_id, homeowner_id, amount, payment_method, stripe_payment_id, status, created_at) FROM stdin;
\.


--
-- Data for Name: properties; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.properties (id, homeowner_id, address, city, state, zip_code, property_size, property_type, notes, qr_code_url, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: refunds; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.refunds (id, payment_id, stripe_refund_id, amount, reason, status, initiated_by_user_id, initiated_by_role, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: service_providers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.service_providers (id, user_id, company_name, description, services_offered, avg_rating, is_verified, stripe_account_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: service_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.service_requests (id, homeowner_id, property_id, service_id, status, description, preferred_date, is_recurring, recurrence_frequency, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: services; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.services (id, name, description, category, base_price, is_recurring, markup_percentage, created_at, updated_at) FROM stdin;
1	Lawn Mowing	Regular lawn mowing and trimming service	Lawn Care	\N	f	15.00	2025-05-16 06:06:50.708248	2025-05-16 06:06:50.708248
2	Gutter Cleaning	Clean and flush gutters and downspouts	Exterior Maintenance	\N	f	15.00	2025-05-16 06:06:50.708248	2025-05-16 06:06:50.708248
3	Window Cleaning	Professional window cleaning, inside and out	Cleaning	\N	f	12.00	2025-05-16 06:06:50.708248	2025-05-16 06:06:50.708248
4	House Cleaning	Thorough house cleaning service	Cleaning	\N	f	10.00	2025-05-16 06:06:50.708248	2025-05-16 06:06:50.708248
5	HVAC Maintenance	Routine HVAC system check and maintenance	HVAC	\N	f	15.00	2025-05-16 06:06:50.708248	2025-05-16 06:06:50.708248
6	Exterior Painting	House exterior painting service	Painting	\N	f	15.00	2025-05-16 06:06:50.708248	2025-05-16 06:06:50.708248
7	Dock Installation	Seasonal dock installation service	Waterfront	\N	f	18.00	2025-05-16 06:06:50.708248	2025-05-16 06:06:50.708248
8	Dock Removal	Seasonal dock removal service	Waterfront	\N	f	18.00	2025-05-16 06:06:50.708248	2025-05-16 06:06:50.708248
9	Boat Cleaning	Professional boat cleaning and detailing	Waterfront	\N	f	15.00	2025-05-16 06:06:50.708248	2025-05-16 06:06:50.708248
10	Snow Plowing	Snow removal from driveways and walkways	Winter Services	\N	f	20.00	2025-05-16 06:06:50.708248	2025-05-16 06:06:50.708248
11	Lawn Fertilization	Professional lawn fertilization service	Lawn Care	\N	f	15.00	2025-05-16 06:06:50.708248	2025-05-16 06:06:50.708248
12	Gardening	Professional gardening and landscaping service	Lawn Care	\N	f	15.00	2025-05-16 06:06:50.708248	2025-05-16 06:06:50.708248
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, firebase_uid, email, phone, first_name, last_name, role, created_at, updated_at) FROM stdin;
\.


--
-- Name: bids_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.bids_id_seq', 1, false);


--
-- Name: homeowners_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.homeowners_id_seq', 1, false);


--
-- Name: invoices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.invoices_id_seq', 1, false);


--
-- Name: migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.migrations_id_seq', 3, true);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notifications_id_seq', 1, false);


--
-- Name: payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payments_id_seq', 1, false);


--
-- Name: properties_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.properties_id_seq', 1, false);


--
-- Name: refunds_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.refunds_id_seq', 1, false);


--
-- Name: service_providers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.service_providers_id_seq', 1, false);


--
-- Name: service_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.service_requests_id_seq', 1, false);


--
-- Name: services_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.services_id_seq', 12, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 1, false);


--
-- Name: bids bids_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bids
    ADD CONSTRAINT bids_pkey PRIMARY KEY (id);


--
-- Name: homeowners homeowners_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.homeowners
    ADD CONSTRAINT homeowners_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_name_key UNIQUE (name);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: properties properties_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_pkey PRIMARY KEY (id);


--
-- Name: refunds refunds_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refunds
    ADD CONSTRAINT refunds_pkey PRIMARY KEY (id);


--
-- Name: refunds refunds_stripe_refund_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refunds
    ADD CONSTRAINT refunds_stripe_refund_id_key UNIQUE (stripe_refund_id);


--
-- Name: service_providers service_providers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_providers
    ADD CONSTRAINT service_providers_pkey PRIMARY KEY (id);


--
-- Name: service_requests service_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_requests
    ADD CONSTRAINT service_requests_pkey PRIMARY KEY (id);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_firebase_uid_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_firebase_uid_key UNIQUE (firebase_uid);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_bids_provider; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bids_provider ON public.bids USING btree (provider_id);


--
-- Name: idx_bids_service_request; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bids_service_request ON public.bids USING btree (service_request_id);


--
-- Name: idx_invoices_homeowner; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoices_homeowner ON public.invoices USING btree (homeowner_id);


--
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at);


--
-- Name: idx_notifications_is_read; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_is_read ON public.notifications USING btree (is_read);


--
-- Name: idx_notifications_related; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_related ON public.notifications USING btree (related_to, related_id);


--
-- Name: idx_notifications_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_user ON public.notifications USING btree (user_id);


--
-- Name: idx_properties_homeowner; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_properties_homeowner ON public.properties USING btree (homeowner_id);


--
-- Name: idx_refunds_payment; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_refunds_payment ON public.refunds USING btree (payment_id);


--
-- Name: idx_refunds_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_refunds_status ON public.refunds USING btree (status);


--
-- Name: idx_service_requests_homeowner; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_service_requests_homeowner ON public.service_requests USING btree (homeowner_id);


--
-- Name: idx_service_requests_property; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_service_requests_property ON public.service_requests USING btree (property_id);


--
-- Name: notifications mark_old_notifications_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER mark_old_notifications_trigger AFTER INSERT ON public.notifications FOR EACH STATEMENT EXECUTE FUNCTION public.auto_mark_old_notifications_as_read();


--
-- Name: bids bids_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bids
    ADD CONSTRAINT bids_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.service_providers(id);


--
-- Name: bids bids_service_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bids
    ADD CONSTRAINT bids_service_request_id_fkey FOREIGN KEY (service_request_id) REFERENCES public.service_requests(id) ON DELETE CASCADE;


--
-- Name: homeowners homeowners_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.homeowners
    ADD CONSTRAINT homeowners_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: invoices invoices_bid_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_bid_id_fkey FOREIGN KEY (bid_id) REFERENCES public.bids(id);


--
-- Name: invoices invoices_homeowner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_homeowner_id_fkey FOREIGN KEY (homeowner_id) REFERENCES public.homeowners(id);


--
-- Name: invoices invoices_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.service_providers(id);


--
-- Name: invoices invoices_service_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_service_request_id_fkey FOREIGN KEY (service_request_id) REFERENCES public.service_requests(id);


--
-- Name: payments payments_homeowner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_homeowner_id_fkey FOREIGN KEY (homeowner_id) REFERENCES public.homeowners(id);


--
-- Name: payments payments_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id);


--
-- Name: properties properties_homeowner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_homeowner_id_fkey FOREIGN KEY (homeowner_id) REFERENCES public.homeowners(id) ON DELETE CASCADE;


--
-- Name: service_providers service_providers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_providers
    ADD CONSTRAINT service_providers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: service_requests service_requests_homeowner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_requests
    ADD CONSTRAINT service_requests_homeowner_id_fkey FOREIGN KEY (homeowner_id) REFERENCES public.homeowners(id);


--
-- Name: service_requests service_requests_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_requests
    ADD CONSTRAINT service_requests_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id);


--
-- Name: service_requests service_requests_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_requests
    ADD CONSTRAINT service_requests_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id);


--
-- PostgreSQL database dump complete
--

