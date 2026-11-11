<?php
require_once __DIR__ . '/../config/bootstrap.php';
require_admin();
$result=$conn->query("SELECT user_id,school_id,full_name,email,department,program,year_level,section,created_at FROM users WHERE role='user' ORDER BY full_name");
respond(['success'=>true,'users'=>$result->fetch_all(MYSQLI_ASSOC)]);
