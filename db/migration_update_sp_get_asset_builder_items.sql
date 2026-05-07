-- Update sp_get_asset_builder_items to include is_parent column
-- This allows the API to return parent asset information
-- Parent asset is ordered first in the list

DROP PROCEDURE IF EXISTS sp_get_asset_builder_items;

DELIMITER ;;

CREATE PROCEDURE sp_get_asset_builder_items(
    IN p_builder_id CHAR(36)
)
BEGIN
    SELECT
        abi.itemID,
        abi.builder_id,
        abi.asset_id,
        a.asset_code,
        a.name as asset_name,
        ac.name as category_name,
        at.name as type_name,
        abi.is_parent,
        abi.created_at
    FROM asset_builder_items abi
    JOIN assets a ON abi.asset_id = a.assetID
    LEFT JOIN asset_categories ac ON a.category_id = ac.categoryID
    LEFT JOIN asset_types at ON a.type_id = at.typeID
    WHERE abi.builder_id = p_builder_id
    ORDER BY abi.is_parent DESC, abi.created_at;
END ;;

DELIMITER ;
