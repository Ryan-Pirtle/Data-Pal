from sqlalchemy import MetaData, Table, Column, String, inspect

def create_dynamic_table(table_name: str, columns: list[str], engine):
    metadata = MetaData()

    inspector = inspect(engine)
    if not inspector.has_table(table_name):
        table = Table(
            table_name,
            metadata,
            *(Column(col, String) for col in columns)  # default to String for MVP
        )
        metadata.create_all(engine)
    else:
        table = Table(table_name, metadata, autoload_with=engine)

    return table
