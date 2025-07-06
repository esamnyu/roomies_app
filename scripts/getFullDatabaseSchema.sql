-- Get complete database schema information

-- 1. All tables with columns
SELECT 
    'TABLES' as section,
    t.table_name,
    array_agg(
        json_build_object(
            'column_name', c.column_name,
            'data_type', c.data_type,
            'is_nullable', c.is_nullable,
            'column_default', c.column_default
        ) ORDER BY c.ordinal_position
    ) as columns
FROM information_schema.tables t
JOIN information_schema.columns c ON c.table_name = t.table_name
WHERE t.table_schema = 'public'
AND t.table_type = 'BASE TABLE'
GROUP BY t.table_name

UNION ALL

-- 2. All functions
SELECT 
    'FUNCTIONS' as section,
    p.proname as table_name,
    array_agg(
        json_build_object(
            'function_name', p.proname,
            'arguments', pg_get_function_arguments(p.oid),
            'return_type', pg_get_function_result(p.oid),
            'language', l.lanname
        )
    ) as columns
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_language l ON l.oid = p.prolang
WHERE n.nspname = 'public'
GROUP BY p.proname

UNION ALL

-- 3. All indexes
SELECT 
    'INDEXES' as section,
    i.indexname as table_name,
    array_agg(
        json_build_object(
            'table_name', i.tablename,
            'index_name', i.indexname,
            'index_definition', i.indexdef
        )
    ) as columns
FROM pg_indexes i
WHERE i.schemaname = 'public'
GROUP BY i.indexname

UNION ALL

-- 4. All views
SELECT 
    'VIEWS' as section,
    v.table_name,
    array_agg(
        json_build_object(
            'view_name', v.table_name,
            'view_definition', pg_get_viewdef(c.oid)
        )
    ) as columns
FROM information_schema.views v
JOIN pg_class c ON c.relname = v.table_name
WHERE v.table_schema = 'public'
GROUP BY v.table_name

ORDER BY section, table_name;