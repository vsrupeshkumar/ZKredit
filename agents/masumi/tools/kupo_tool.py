#!/usr/bin/env python3
import os
import requests
import json
from crewai.tools import BaseTool
from pydantic import BaseModel, Field
from typing import Optional, Type, Dict

class KupoToolInput(BaseModel):
    cardano_address: str = Field(..., description="The Cardano address to query using the Kupo API")
    top_assets_filter: Optional[int] = Field(default=None, description="The number of top assets to filter by")

class KupoTool(BaseTool):
    name: str = "KupoTool"
    description: str = """
    Uses the Kupo AI to fetch Cardano Native Assets stored in a given Cardano address.
    Optionally filters by top assets. Always includes lovelace.
    """
    args_schema: Type[BaseModel] = KupoToolInput
    base_url: str = "The base URL of the Kupo API"

    def __init__(self, base_url: Optional[str] = None, **kwargs):     
        super().__init__(**kwargs)
        base_url = base_url or os.getenv("KUPO_BASE_URL")
        if not base_url:
            raise ValueError("Either set KUPO_BASE_URL environment variable or pass base_url to KupoTool")
        self.base_url = base_url

    def _run(self, cardano_address: str, top_assets_filter: int = None) -> Dict[str, int]:
        try:
            data = requests.get(f"{self.base_url}/matches/{cardano_address}?unspent").json()
            fetched_assets = self._process_kupo_data(data, top_assets_filter)

            return fetched_assets

        except requests.exceptions.RequestException as e:
            print(f"Error making request: {e}")
            return {"error": str(e)}
        except json.JSONDecodeError as e:
            print(f"Error parsing JSON: {e}")
            return {"error": str(e)}

    def _process_kupo_data(self, data: list, top_assets_filter: int = None) -> Dict[str, int]:
        assets_total: Dict[str, int] = {"lovelace": 0}

        for utxo in data:
            lovelace = utxo['value']
            assets_total["lovelace"] += int(lovelace['coins'])
            for asset_id, amount in lovelace['assets'].items():
                assets_total.setdefault(asset_id, 0)
                assets_total[asset_id] += int(amount)

        if not top_assets_filter:
            return assets_total
        else:
            # Sort assets descending, excluding lovelace
            sorted_assets = sorted(
                [(k, v) for k, v in assets_total.items() if k != "lovelace"],
                key=lambda x: x[1],
                reverse=True
            )
            # Start by extracting lovelace amount cause we always want to include it.
            lovelace_amount = assets_total["lovelace"]
            # Then extract the top 4 assets by amount.
            top_assets = dict(sorted_assets[:top_assets_filter])
            # Combine lovelace amount with top 4 assets and return.
            return {"lovelace": lovelace_amount, **top_assets}

# Example usage
if __name__ == "__main__":
    import os
    tool = KupoTool(base_url=os.getenv("KUPO_BASE_URL"))
    # result = tool._run("addr_test1wz4ydpqxpstg453xlr6v3elpg578ussvk8ezunkj62p9wjq7uw9zq")
    result = tool._run("addr1x89ksjnfu7ys02tedvslc9g2wk90tu5qte0dt4dge60hdudj764lvrxdayh2ux30fl0ktuh27csgmpevdu89jlxppvrsg0g63z")
    print(len(result.keys()))
