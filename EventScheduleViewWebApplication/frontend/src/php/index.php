<?php
declare(strict_types=1);

ini_set('display_errors', '1'); // 公開時は 0 推奨
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');

require __DIR__ . '/config.php';

/** 共通レスポンス */
function respond($data, int $code = 200) {
  http_response_code($code);
  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

/** 例外レスポンス（開発用：メッセージも返す） */
function respond_error(Throwable $e, int $code = 500) {
  http_response_code($code);
  error_log('[API] ' . $e->getMessage() . "\n" . $e->getTraceAsString());
  echo json_encode([
    'error'   => 'Server error',
    'message' => $e->getMessage(),
  ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

/** JSON ボディ取得（POST/PUT 用） */
function read_json(): array {
  $raw = file_get_contents('php://input');
  if ($raw === false || $raw === '') return [];
  $data = json_decode($raw, true);
  return is_array($data) ? $data : [];
}

try {
  // ---- ルーティング判定 ----
  $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
  $base = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/'); // 通常 /api
  $endpoint = '/' . ltrim(substr($path, strlen($base)), '/'); // 例: /events, /events/1

  // ---- DB不要の疎通 ----
  if ($endpoint === '/ping') {
    respond(['ok' => true, 'time' => date('c')]);
  }

  // ---- DB接続（必要になってから）----
  $pdo = pdo();

  // ========= ユーザー登録（POST /register）=========
  // body: { "email": "...", "password": "...", "name": "..." }
  if ($endpoint === '/api/register' && $_SERVER['REQUEST_METHOD'] === 'POST') {

    
    $email     = trim((string)($body['email'] ?? ''));
    $password  = (string)($body['password'] ?? '');
    $birthdate = trim((string)($body['birthdate'] ?? ''));
    $display_name = (string)($body['display_name'] ?? '');
    
    // 未入力バリデーション
    if ($email === '' || $password === '' || $passwordConfirm === '' || $birthdate === '') {
      respond(['error' => '必須項目が未入力です（email / password / passwordConfirm / birthdate）'], 400);
    }
    // メールアドレス形式バリデーション
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
      respond(['error' => 'メールアドレスの形式が不正です'], 400);
    }

    // 生年月日バリデーション（YYYY-MM-DD）
    $dt = DateTime::createFromFormat('Y-m-d', $birthdate);
    $errors = DateTime::getLastErrors();
    if ($dt === false || $errors['warning_count'] > 0 || $errors['error_count'] > 0) {
      respond(['error' => '生年月日の形式は YYYY-MM-DD で入力してください'], 400);
    }
    $birthdateSql = $dt->format('Y-m-d');

    // 既存メール重複チェック
    $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
      respond(['error' => 'このメールアドレスは既に登録されています'], 409);
    }

    // パスワードハッシュ
    $hash = password_hash($password, PASSWORD_DEFAULT);

    // 作成（display_name は今回未入力想定なので NULL）
    $stmt = $pdo->prepare(
      'INSERT INTO users (email, password, display_name, user_birthday_date, user_role)
       VALUES (:email, :password, NULL, :bday, 0)'
    );
    $stmt->execute([
      ':email'    => $email,
      ':password' => $hash,
      ':bday'     => $birthdateSql,
    ]);

    $newId = (int)$pdo->lastInsertId();

    respond([
      'ok' => true,
      'user' => [
        'id' => $newId,
        'email' => $email,
        'user_role' => 0,
        'user_birthday_date' => $birthdateSql,
      ],
    ], 201);
  }

  // ========= ログイン（POST /login）=========
  // body: { "email": "...", "password": "..." }
  // 既存 DB に平文が残っていても、ハッシュでもどちらでも通す（移行期間想定）
  if ($endpoint === '/login' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
      $body = read_json();
      $email = trim((string)($body['email'] ?? ''));
      $pass  = (string)($body['password'] ?? '');

      if ($email === '' || $pass === '') {
        respond(['error' => 'メールとパスワードは必須です'], 400);
      }

      $st = $pdo->prepare('SELECT id, email, password, name FROM users WHERE email = ? LIMIT 1');
      $st->execute([$email]);
      $user = $st->fetch(PDO::FETCH_ASSOC);
      if (!$user) {
        respond(['error' => 'メールまたはパスワードが違います'], 401);
      }

      $stored = (string)$user['password'];

      // 1) ハッシュ検証
      $ok = password_verify($pass, $stored);
      // 2) 互換：平文保存だった時代の値と一致するなら OK（早期移行推奨）
      if (!$ok && hash_equals($stored, $pass)) {
        $ok = true;
      }

      if (!$ok) {
        respond(['error' => 'メールまたはパスワードが違います'], 401);
      }

      respond([
        'id'    => (int)$user['id'],
        'email' => $user['email'],
        'display_name'  => $user['display_name'],
      ]);

    } catch (Throwable $e) {
      respond_error($e, 500);
    }
  }

  // ========= イベント一覧（GET /events）=========
  if ($endpoint === '/events' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $sql = 'SELECT id, title, date, detail, bar_id AS barId
            FROM events
            ORDER BY date DESC';
    $events = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);

    // bar をネストして返す（JOIN でも可。まずは個別取得でシンプルに）
    $stBar = $pdo->prepare('SELECT id, name FROM bars WHERE id = ? LIMIT 1');
    foreach ($events as &$e) {
      $barName = '会場不明';
      $barIdOut = null;
      if (!empty($e['barId'])) {
        $stBar->execute([(int)$e['barId']]);
        if ($bar = $stBar->fetch(PDO::FETCH_ASSOC)) {
          $barName = $bar['name'];
          $barIdOut = (int)$bar['id'];
        }
      }
      $e['bar'] = [
        'id'   => $barIdOut ?? (isset($e['barId']) ? (int)$e['barId'] : null),
        'name' => $barName,
      ];
    }
    unset($e);

    respond($events);
  }

  // ========= イベント詳細（GET /events/{id}）=========
  if (preg_match('#^/events/(\d+)$#', $endpoint, $m) && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $id = (int)$m[1];

    $sql = 'SELECT e.id, e.title, e.date, e.detail,
                   b.id AS bar_id, b.name AS bar_name, b.address, b.tel, b.description
            FROM events e
            JOIN bars b ON b.id = e.bar_id
            WHERE e.id = ?';
    $st = $pdo->prepare($sql);
    $st->execute([$id]);
    $e = $st->fetch(PDO::FETCH_ASSOC);
    if (!$e) respond(['error' => 'Event not found'], 404);

    // 中間テーブル名は event_djs（複数形）
    $sqlDj = 'SELECT ed.id AS event_dj_id, d.id AS dj_id, d.name, d.genre, d.profile
              FROM event_djs ed
              JOIN djs d ON d.id = ed.dj_id
              WHERE ed.event_id = ?';
    $st2 = $pdo->prepare($sqlDj);
    $st2->execute([$id]);
    $djs = [];
    foreach ($st2 as $row) {
      $djs[] = [
        'id' => (int)$row['event_dj_id'],
        'dj' => [
          'id' => (int)$row['dj_id'],
          'name' => $row['name'],
          'genre' => $row['genre'],
          'profile' => $row['profile'],
        ],
      ];
    }

    respond([
      'id' => (int)$e['id'],
      'title' => $e['title'],
      'date' => $e['date'],
      'detail' => $e['detail'],
      'bar' => [
        'id' => (int)$e['bar_id'],
        'name' => $e['bar_name'],
        'address' => $e['address'],
        'tel' => $e['tel'],
        'description' => $e['description'],
      ],
      'djs' => $djs,
    ]);
  }

  // ========= BAR 詳細（GET /bars/{id}）=========
  if (preg_match('#^/bars/(\d+)$#', $endpoint, $m) && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $id = (int)$m[1];
    $st = $pdo->prepare('SELECT id, name, address, tel, description FROM bars WHERE id = ?');
    $st->execute([$id]);
    $bar = $st->fetch(PDO::FETCH_ASSOC);
    if (!$bar) respond(['error' => 'Bar not found'], 404);
    respond([
      'id' => (int)$bar['id'],
      'name' => $bar['name'],
      'address' => $bar['address'],
      'tel' => $bar['tel'],
      'description' => $bar['description'],
    ]);
  }

  // ========= DJ 詳細（GET /djs/{id}）=========
  if (preg_match('#^/djs/(\d+)$#', $endpoint, $m) && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $id = (int)$m[1];
    $st = $pdo->prepare('SELECT id, name, genre, profile FROM djs WHERE id = ?');
    $st->execute([$id]);
    $dj = $st->fetch(PDO::FETCH_ASSOC);
    if (!$dj) respond(['error' => 'DJ not found'], 404);
    respond([
      'id' => (int)$dj['id'],
      'name' => $dj['name'],
      'genre' => $dj['genre'],
      'profile' => $dj['profile'],
    ]);
  }

  // ========= 何にもマッチしない =========
  respond(['error' => 'Not found', 'endpoint' => $endpoint], 404);

} catch (Throwable $e) {
  // グローバルキャッチ
  respond_error($e, 500);
}
