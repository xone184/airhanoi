<?php
/**
 * News API
 * Endpoints:
 *   GET /api/news.php - Get news items
 *   GET /api/news.php?action=fetch_external - Fetch news from external sources (admin)
 *   POST /api/news.php - Create news (admin only)
 */

require_once 'config.php';

$db = Database::getInstance()->getConnection();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? null;

if ($method === 'GET') {
    if ($action === 'fetch_external') {
        // Allow any user to refresh news from external sources
        handleFetchAndStoreNews();
    } else {
        handleGetNews();
    }
} elseif ($method === 'POST') {
    requireAdmin();
    handleCreateNews();
} else {
    sendError('Method not allowed', 405);
}

function handleGetNews()
{
    global $db;

    $category = $_GET['category'] ?? 'all';
    $limit = (int) ($_GET['limit'] ?? 20);

    $query = "
        SELECT 
            news_id as id,
            title,
            summary,
            category,
            image_url as imageUrl,
            author,
            external_url as url,
            published_at as date,
            views
        FROM news_items
        WHERE is_published = 1
    ";

    $params = [];

    if ($category !== 'all') {
        $query .= " AND category = ?";
        $params[] = $category;
    }

    $query .= " ORDER BY published_at DESC LIMIT ?";
    $params[] = $limit;

    $stmt = $db->prepare($query);
    $stmt->execute($params);
    $news = $stmt->fetchAll();

    // Format dates
    foreach ($news as &$item) {
        $item['date'] = date('d/m/Y', strtotime($item['date']));
    }

    sendSuccess($news);
}

function handleFetchAndStoreNews()
{
    $redditNews = fetchRedditNews();
    $googleNews = fetchGoogleNews();

    $allNews = array_merge($redditNews, $googleNews);
    $insertedCount = 0;

    foreach ($allNews as $item) {
        if (insertNewsItem($item)) {
            $insertedCount++;
        }
    }

    sendSuccess(['message' => "Fetched and stored news.", 'inserted' => $insertedCount]);
}

function curl_get_contents($url)
{
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_USERAGENT, 'HanoiAirQuality/1.0');
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // For localhost development
    $data = curl_exec($ch);
    curl_close($ch);
    return $data;
}

function fetchRedditNews()
{
    $url = 'https://www.reddit.com/r/Vietnam/search.json?q=air%20quality%20OR%20pollution%20OR%20environment&restrict_sr=1&sort=new&limit=10';
    $json = json_decode(curl_get_contents($url), true);
    $newsItems = [];

    if (isset($json['data']['children'])) {
        foreach ($json['data']['children'] as $child) {
            $data = $child['data'];
            $img = "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=2074&auto=format&fit=crop";
            if (!empty($data['preview']['images'][0]['source']['url'])) {
                $img = html_entity_decode($data['preview']['images'][0]['source']['url']);
            } elseif (!empty($data['thumbnail']) && $data['thumbnail'] !== 'self') {
                $img = $data['thumbnail'];
            }

            $newsItems[] = [
                'title' => $data['title'],
                'summary' => substr($data['selftext'], 0, 250) . (strlen($data['selftext']) > 250 ? '...' : ''),
                'category' => 'news',
                'imageUrl' => $img,
                'author' => 'Reddit (u/' . $data['author'] . ')',
                'url' => 'https://www.reddit.com' . $data['permalink'],
                'date' => date('Y-m-d H:i:s', $data['created_utc']),
            ];
        }
    }
    return $newsItems;
}

function fetchGoogleNews()
{
    $query = urlencode('ô nhiễm không khí hà nội OR môi trường OR khói bụi');
    $url = "https://news.google.com/rss/search?q={$query}&hl=vi&gl=VN&ceid=VN:vi";
    $xmlString = curl_get_contents($url);
    $newsItems = [];

    if ($xmlString) {
        $xml = simplexml_load_string($xmlString);
        foreach ($xml->channel->item as $item) {
            $newsItems[] = [
                'title' => (string) $item->title,
                'summary' => strip_tags((string) $item->description),
                'category' => 'news',
                'imageUrl' => 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=2070', // Placeholder
                'author' => (string) $item->source,
                'url' => (string) $item->link,
                'date' => date('Y-m-d H:i:s', strtotime((string) $item->pubDate)),
            ];
        }
    }
    return array_slice($newsItems, 0, 10);
}

function insertNewsItem($item)
{
    global $db;

    // Truncate long URLs to fit database column (max 500 chars for safety)
    $url = substr($item['url'] ?? '', 0, 500);
    $imageUrl = substr($item['imageUrl'] ?? '', 0, 500);
    $title = substr($item['title'] ?? '', 0, 500);
    $summary = substr($item['summary'] ?? '', 0, 1000);
    $author = substr($item['author'] ?? '', 0, 100);

    // Check if URL exists
    $stmt = $db->prepare("SELECT 1 FROM news_items WHERE external_url = ?");
    $stmt->execute([$url]);
    if ($stmt->fetch()) {
        return false; // Skip if already exists
    }

    $stmt = $db->prepare("
        INSERT INTO news_items 
        (title, summary, category, image_url, author, external_url, published_at, is_published)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    ");

    return $stmt->execute([
        sanitize($title),
        sanitize($summary),
        sanitize($item['category'] ?? 'news'),
        sanitize($imageUrl),
        sanitize($author),
        sanitize($url),
        $item['date']
    ]);
}

function handleCreateNews()
{
    global $db;
    $input = getJsonInput();

    $title = sanitize($input['title'] ?? '');
    $summary = sanitize($input['summary'] ?? '');
    $content = $input['content'] ?? '';
    $category = sanitize($input['category'] ?? 'news');
    $imageUrl = sanitize($input['imageUrl'] ?? '');
    $author = sanitize($input['author'] ?? '');
    $externalUrl = sanitize($input['url'] ?? '');
    $publishedAt = $input['publishedAt'] ?? date('Y-m-d H:i:s');

    if (empty($title) || empty($summary)) {
        sendError('Title and summary are required', 400);
    }

    $stmt = $db->prepare("
        INSERT INTO news_items 
        (title, summary, content, category, image_url, author, external_url, published_at, is_published)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    ");

    $stmt->execute([
        $title,
        $summary,
        $content,
        $category,
        $imageUrl,
        $author,
        $externalUrl,
        date('Y-m-d H:i:s', strtotime($publishedAt))
    ]);

    sendSuccess(['message' => 'News created successfully'], 201);
}
