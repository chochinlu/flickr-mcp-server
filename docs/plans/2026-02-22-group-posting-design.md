# Flickr Group Posting Strategy & Tools

## Strategy: Tiered Rotation

Each photo gets posted to 3-5 groups, not 15+.

### Tier 1 — Core groups (2-3): every photo
Fixed groups you always post to. High-quality BW and Street Photography groups.

### Tier 2 — Rotation groups (6-10): random 1-2 per photo
Broader theme groups (RICOH GR, Monochrome, Urban Photography). Randomly selected each time to avoid repetition.

### Tier 3 — Conditional groups: only when tags match
Special-interest groups (Cats, Dogs, Rain, Night, Taiwan, Vietnam). Auto-matched by photo tags.

## MCP Server Tools

### 1. `flickr_list_my_groups`
- API: `flickr.people.getGroups`
- Returns: group ID, name, member count, photo count
- Purpose: inventory groups, assign tiers

### 2. `flickr_add_photo_to_group`
- API: `flickr.groups.pools.add`
- Params: `photo_id`, `group_id`
- Purpose: post photo to group pool

### 3. `flickr_search_groups` (optional, future)
- API: `flickr.groups.search`
- Purpose: discover new relevant groups

## Configuration

File: `config/groups.json`

```json
{
  "tier1": ["group_id_1", "group_id_2"],
  "tier2": ["group_id_3", "group_id_4", "..."],
  "tier3": {
    "cat,cats": "group_id_cats",
    "dog,dogs,whippet,pet": "group_id_dogs",
    "rain,rainy,raindrops": "group_id_rain",
    "night,nightphotography": "group_id_night",
    "taiwan": "group_id_taiwan"
  }
}
```

## Workflow

1. User: "post this photo to groups"
2. Claude: reads photo tags via `flickr_get_photo_info`
3. Claude: reads `config/groups.json`
4. Claude: posts to all Tier 1 + random 1-2 Tier 2 + matching Tier 3
5. Claude: reports results
