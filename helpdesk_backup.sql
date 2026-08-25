--
-- PostgreSQL database dump
--

\restrict fcGocP1dlXNiZLPa8Zc4oK1okS92BMEpB6PQa9LxNn6zsF5bqldtNUOFXNe7Q8F

-- Dumped from database version 17.10 (Debian 17.10-1.pgdg13+1)
-- Dumped by pg_dump version 17.10 (Debian 17.10-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public."Ticket" DROP CONSTRAINT IF EXISTS "Ticket_createdById_fkey";
ALTER TABLE IF EXISTS ONLY public."Ticket" DROP CONSTRAINT IF EXISTS "Ticket_assignedToId_fkey";
DROP INDEX IF EXISTS public."User_email_key";
DROP INDEX IF EXISTS public."Ticket_ticketNumber_key";
ALTER TABLE IF EXISTS ONLY public._prisma_migrations DROP CONSTRAINT IF EXISTS _prisma_migrations_pkey;
ALTER TABLE IF EXISTS ONLY public."User" DROP CONSTRAINT IF EXISTS "User_pkey";
ALTER TABLE IF EXISTS ONLY public."Ticket" DROP CONSTRAINT IF EXISTS "Ticket_pkey";
ALTER TABLE IF EXISTS public."User" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."Ticket" ALTER COLUMN id DROP DEFAULT;
DROP TABLE IF EXISTS public._prisma_migrations;
DROP SEQUENCE IF EXISTS public."User_id_seq";
DROP TABLE IF EXISTS public."User";
DROP SEQUENCE IF EXISTS public."Ticket_id_seq";
DROP TABLE IF EXISTS public."Ticket";
DROP TYPE IF EXISTS public."Status";
DROP TYPE IF EXISTS public."Role";
-- *not* dropping schema, since initdb creates it
--
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


--
-- Name: Role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."Role" AS ENUM (
    'USER',
    'HELPDESK',
    'ENGINEER'
);


ALTER TYPE public."Role" OWNER TO postgres;

--
-- Name: Status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."Status" AS ENUM (
    'OPEN',
    'ASSIGNED',
    'RESOLVED',
    'HOLD'
);


ALTER TYPE public."Status" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Ticket; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Ticket" (
    id integer NOT NULL,
    "ticketNumber" text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    hostname text,
    category text,
    "subCategory" text,
    "attachmentUrl" text,
    status public."Status" DEFAULT 'OPEN'::public."Status" NOT NULL,
    "createdById" integer NOT NULL,
    "assignedToId" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    notes text,
    priority text DEFAULT 'Standard'::text
);


ALTER TABLE public."Ticket" OWNER TO postgres;

--
-- Name: Ticket_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Ticket_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Ticket_id_seq" OWNER TO postgres;

--
-- Name: Ticket_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Ticket_id_seq" OWNED BY public."Ticket".id;


--
-- Name: User; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."User" (
    id integer NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    name text NOT NULL,
    role public."Role" DEFAULT 'USER'::public."Role" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."User" OWNER TO postgres;

--
-- Name: User_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."User_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."User_id_seq" OWNER TO postgres;

--
-- Name: User_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."User_id_seq" OWNED BY public."User".id;


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Name: Ticket id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Ticket" ALTER COLUMN id SET DEFAULT nextval('public."Ticket_id_seq"'::regclass);


--
-- Name: User id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User" ALTER COLUMN id SET DEFAULT nextval('public."User_id_seq"'::regclass);


--
-- Data for Name: Ticket; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Ticket" (id, "ticketNumber", title, description, hostname, category, "subCategory", "attachmentUrl", status, "createdById", "assignedToId", "createdAt", "updatedAt", notes, priority) FROM stdin;
2	20260002	Installkan saya Minvu	Dear HD mohon dibantu	ABCD	Software	Install Aplikasi Desain/Video	uploads\\1783779743693-Screenshot_261.png	RESOLVED	1	3	2026-07-11 14:22:23.714	2026-07-11 14:39:42.847	\N	Standard
1	20260001	PC Ucak	Dear HelpDesk Tolong dibantu tiket ini	172.94.53.2	Hardware	Monitor Blank/Rusak	uploads\\1783778739887-Untitled Diagram (3).jpg	RESOLVED	1	4	2026-07-11 14:05:39.897	2026-07-11 14:52:13.93	\N	Standard
10	20260010	Akun Lupa  Password	Dear HD Mohon dibantu reset password akun saya	-	Account	Microsoft 365	\N	RESOLVED	1	\N	2026-07-18 01:19:36.141	2026-07-18 01:33:39.733	Dear Pak Yusuf Mohon dibantu cek kembali	Urgent
3	20260003	PC saya Bermasalah	Dear HD Mohon dibantu tiket saya	1029389u120	Hardware	Keyboard / Mouse Error	\N	RESOLVED	1	3	2026-07-12 08:44:40.543	2026-07-12 13:21:05.651	Done sudah dibantu berikan keyboard Backup	Standard
4	20260004	Upgrade SSD	Dear HD Mohon dibantu upgrade PC saya	assdczx	Hardware	Upgrade Hardware (RAM/SSD)	uploads\\1783863269257-Total peso.jpg	RESOLVED	1	4	2026-07-12 13:34:29.271	2026-07-12 14:14:02.549	Done sudah dibantu upgrade	Urgent
5	20260005	Test Tikettt	Install adobe premiere Pro	125131	Software	Install Aplikasi Desain/Video	uploads\\1784030395816-pemilu-2024-1-1170x725.jpg	RESOLVED	1	5	2026-07-14 11:59:55.827	2026-07-14 23:18:08.82	Done sudah dibantu	Standard
12	20260012	PC Pak Ramlan installkan software vidio	Dear HD Tolong Installkan software adobe premiere pro	172.16.3.55	Software	Install Aplikasi Desain/Video	\N	RESOLVED	1	3	2026-07-18 01:57:39.734	2026-07-18 02:01:00.535	Done Sudah dibantu Install	Urgent
11	20260011	Akun Rekan Saya Pak Rusli Terlock	Dear HD Mohon dibantu tiket saya	-	Account	Windows AD	\N	RESOLVED	1	5	2026-07-18 01:56:34.507	2026-07-18 02:07:13.392	Done	Urgent
7	20260007	Laptop Saya tidak Konek Net Work	Dear HD Mohon dibantu Tiket Saya	172.16.3.2	Software	Install Aplikasi Desain/Video	\N	RESOLVED	1	3	2026-07-16 13:59:09.956	2026-07-16 14:51:52.584	Done	Urgent
13	20260013	TEST	Test	178.16.23.9	Hardware	Monitor Blank/Rusak	\N	HOLD	1	3	2026-07-25 03:51:35.256	2026-07-25 04:15:07.948	Mengunggu backup	Urgent
6	20260006	Jam Tangan Digital Saya Error	Dear HD Mohon dibantu jam saya rusak terlampir gambarnya	12412414	Hardware	Monitor Blank/Rusak	uploads\\1784153821892-1784030395816-pemilu-2024-1-1170x725.jpg	RESOLVED	1	3	2026-07-15 22:17:01.912	2026-07-18 00:56:50.543	Done,\nSudah dbantu cek dan di tukarkan yang baru	Urgent
8	20260008	Hp Sya rusak	Dear HD belum ada Category dan sub categorynya	172.16.3.88	Software	Install Antivirus	\N	RESOLVED	1	4	2026-07-16 14:27:37.339	2026-07-18 00:59:26.974	Done	Urgent
9	20260009	Akun Saya sering terlock	Dear HD Mohon dibantu akun saya sering terlock	-	Account	Windows AD	\N	RESOLVED	1	\N	2026-07-18 01:07:25.468	2026-07-18 01:08:17.541	Dear Pak Yusuf silahkan di coba kembali, Akun sudah dibantu unlock	Standard
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."User" (id, email, password, name, role, "createdAt") FROM stdin;
1	yusufsatriaborneo@gmail.com	$2b$10$HUeVBhOYluJXRBV/4lCjO.io.5vYNOj4jWSpzeSSF84mU2V3.T626	YusufB	USER	2026-07-11 14:04:55.338
2	helpdesk@gmail.com	$2b$10$mJOXIhWM8TFlhOC8oFvoWOZXG7R957X7H2bousQg3J76TmEJKuSTa	helpdesk	HELPDESK	2026-07-11 14:06:12.568
3	engineer@gmail.com	$2b$10$8hXiFm.SKyriPz01xvBIYODSDy83VNuC2mXFocZfEbgZve2jTEU5y	engineer	ENGINEER	2026-07-11 14:06:39.172
4	engineer2@gmail.com	$2b$10$In./VuIWMHyvEYOO/RBUburP/5GvCorVRp9/A8/9mAFjy05e6BaR2	engineer2	ENGINEER	2026-07-11 14:48:33.074
5	engineer3@gmail.com	$2b$10$/ZtmNJZbHZTB9amG/.zEsu2eh88limrqKi4VbaEfKZy7VtZ7sQdvG	engineer3	ENGINEER	2026-07-14 21:47:21.049
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
276d5802-5c92-49b2-b81c-acc2c05c16e0	d192075fbfdfe1d045705b4e7510224d2b7d54ff1a475a9f38df3e7edd14d45b	2026-07-11 14:00:08.028642+00	20260711140007_add_new_ticket_fields	\N	\N	2026-07-11 14:00:07.999666+00	1
91201bf9-c69b-46cc-ac1a-9a4822ad9004	a1ae54c675cba3264e1455fb85808d5de2de33f87523b060b549013bd94fdb93	2026-07-12 09:07:26.765899+00	20260712090726_add_priority_notes	\N	\N	2026-07-12 09:07:26.744215+00	1
e4db6948-38f1-46f3-ab56-b53229369beb	475bfb70ba4260cc3f53cf5912e1929ba70f7ca1b6aa2b9109d0804fb69c2284	2026-07-12 13:18:49.940364+00	20260712131849_add_pending_status	\N	\N	2026-07-12 13:18:49.936629+00	1
\.


--
-- Name: Ticket_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Ticket_id_seq"', 13, true);


--
-- Name: User_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."User_id_seq"', 5, true);


--
-- Name: Ticket Ticket_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Ticket"
    ADD CONSTRAINT "Ticket_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Ticket_ticketNumber_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Ticket_ticketNumber_key" ON public."Ticket" USING btree ("ticketNumber");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: Ticket Ticket_assignedToId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Ticket"
    ADD CONSTRAINT "Ticket_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Ticket Ticket_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Ticket"
    ADD CONSTRAINT "Ticket_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict fcGocP1dlXNiZLPa8Zc4oK1okS92BMEpB6PQa9LxNn6zsF5bqldtNUOFXNe7Q8F

