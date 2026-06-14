alter table denuncias
  add column if not exists observo_sospechosos boolean,
  add column if not exists hubo_testigos boolean;
