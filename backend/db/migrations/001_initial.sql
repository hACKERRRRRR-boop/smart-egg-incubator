CREATE TABLE incubators (
  id integer PRIMARY KEY CHECK(id > 0), name text NOT NULL,
  capacity integer NOT NULL DEFAULT 16 CHECK(capacity = 16)
);
CREATE TABLE incubation_batches (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  incubator_id integer NOT NULL REFERENCES incubators(id),
  start_date date NOT NULL, duration_days integer NOT NULL DEFAULT 21 CHECK(duration_days > 0),
  status text NOT NULL CHECK(status IN ('active','completed','cancelled')),
  source text NOT NULL CHECK(source IN ('mock','manual','device')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX one_active_batch ON incubation_batches(incubator_id) WHERE status = 'active';
CREATE TABLE eggs (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  batch_id integer NOT NULL REFERENCES incubation_batches(id),
  slot integer NOT NULL CHECK(slot BETWEEN 1 AND 16),
  UNIQUE(batch_id,slot)
);
CREATE TABLE sensor_readings (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  incubator_id integer NOT NULL REFERENCES incubators(id),
  recorded_at timestamptz NOT NULL,
  temperature_c double precision NOT NULL CHECK(temperature_c BETWEEN -40 AND 125),
  humidity_percent double precision NOT NULL CHECK(humidity_percent BETWEEN 0 AND 100),
  source text NOT NULL CHECK(source IN ('mock','device'))
);
CREATE INDEX sensor_history ON sensor_readings(incubator_id,recorded_at DESC,id DESC);
CREATE TABLE device_states (
  incubator_id integer PRIMARY KEY REFERENCES incubators(id),
  heater boolean NOT NULL, humidifier boolean NOT NULL, candling_light boolean NOT NULL,
  source text NOT NULL CHECK(source IN ('mock','device')),
  reported_at timestamptz NOT NULL
);
CREATE TABLE ai_results (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  egg_id integer NOT NULL REFERENCES eggs(id),
  analyzed_at timestamptz NOT NULL,
  status text NOT NULL CHECK(status IN ('good','watch','none')),
  hatch_probability_percent double precision NOT NULL CHECK(hatch_probability_percent BETWEEN 0 AND 100),
  label text NOT NULL, model_version text,
  source text NOT NULL CHECK(source IN ('mock','ai'))
);
CREATE INDEX egg_analysis_history ON ai_results(egg_id,analyzed_at DESC,id DESC);
CREATE TABLE seed_runs (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
