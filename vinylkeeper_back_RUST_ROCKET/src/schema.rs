Print table definitions for database schema.

Usage: diesel print-schema [OPTIONS] [table-name]...

Arguments:
  [table-name]...
          Table names to filter.

Options:
      --database-url <DATABASE_URL>
          Specifies the database URL to connect to. Falls back to the DATABASE_URL environment variable if unspecified.

  -s, --schema <schema>
          The name of the schema.

      --config-file <CONFIG_FILE>
          The location of the configuration file to use. Falls back to the `DIESEL_CONFIG_FILE` environment variable if unspecified. Defaults to `diesel.toml` in your project root. See diesel.rs/guides/configuring-diesel-cli for documentation on this file.

  -o, --only-tables
          Only include tables from table-name that matches regexp.

  -e, --except-tables
          Exclude tables from table-name that matches regex.

      --locked-schema
          When `print_schema.file` is specified in your config file, this flag will cause Diesel CLI to error if any command would result in changes to that file. It is recommended that you use this flag when running migrations in CI or production.

      --with-docs
          Render documentation comments for tables and columns.

      --with-docs-config <with-docs-config>
          Render documentation comments for tables and columns.
          
          [possible values: database-comments-fallback-to-auto-generated-doc-comment, only-database-comments, no-doc-comments]

      --column-sorting <column-sorting>
          Sort order for table columns.
          
          [possible values: ordinal_position, name]

      --patch-file <patch-file>
          A unified diff file to be applied to the final schema.

      --import-types <import-types>
          A list of types to import for every table, separated by commas.

      --no-generate-missing-sql-type-definitions
          Generate SQL type definitions for types not provided by diesel

      --except-custom-type-definitions <except-custom-type-definitions>...
          A list of regexes to filter the custom types definitions generated

      --custom-type-derives <custom-type-derives>
          A list of derives to implement for every automatically generated SqlType in the schema, separated by commas.

      --schema-key <schema-key>
          select schema key from diesel.toml, use 'default' for print_schema without key.
          
          [default: default]

      --sqlite-integer-primary-key-is-bigint
          For SQLite 3.37 and above, detect `INTEGER PRIMARY KEY` columns as `BigInt`, when the table isn't declared with `WITHOUT ROWID`.
          See https://www.sqlite.org/lang_createtable.html#rowid for more information.

  -h, --help
          Print help (see a summary with '-h')
