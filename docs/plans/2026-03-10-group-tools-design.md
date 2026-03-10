---
title: Flickr Group Tools — MCP Server
created: 2026-03-10
status: approved
supersedes: 2026-02-22-group-posting-design.md
---

# Flickr Group Tools — MCP Server Design

## Overview

Add 3 new MCP tools for Flickr group operations: list groups, post to group, search groups. These enable the assistant to post photos directly to Flickr groups after suggesting appropriate ones based on photo content and group rules.

## Tools

### 1. `flickr_list_my_groups`

List all groups the user has joined.

- **API**: `flickr.people.getGroups`
- **Parameters**: none (uses authenticated user's NSID)
- **Returns**: group ID, name, member count, pool count, throttle info

### 2. `flickr_add_photo_to_group`

Add a photo to a group pool.

- **API**: `flickr.groups.pools.add`
- **Parameters**:
  - `photo_id` (required) — Flickr photo ID
  - `group_id` (required) — Flickr group ID
- **Returns**: success or error message
- **Error handling**:
  - Photo already in group → "already exists"
  - Posting limit exceeded → "exceeded posting limit"
  - Not a member → "please join the group first"
  - Other API errors → pass through error message

### 3. `flickr_search_groups`

Search for Flickr groups by keyword.

- **API**: `flickr.groups.search`
- **Parameters**:
  - `text` (required) — search keywords
  - `per_page` (optional, default 20) — results per page
  - `page` (optional, default 1) — page number
- **Returns**: group ID, name, member count, pool count

## Implementation

- New file: `src/tools/groups.ts`
- Same patterns as existing `photos.ts` and `albums.ts`
- Register tools in `src/index.ts`
- Uses existing `FlickrClient` for API calls with rate limiting

## Workflow Integration

After photo processing (tags + title + description + albums), the assistant suggests 4 groups based on photo content and group rules, then calls `flickr_add_photo_to_group` upon user confirmation.

## What We're NOT Building

- No config/groups.json — group list lives in Obsidian photography plan
- No automatic tiered rotation logic — assistant judges manually
- No posting history tracking — API errors indicate duplicates/limits
