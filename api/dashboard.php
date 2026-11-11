<?php
require_once __DIR__ . '/../config/bootstrap.php';
require_admin();
$upcoming=(int)$conn->query("SELECT COUNT(*) n FROM events WHERE event_date >= CURDATE()")->fetch_assoc()['n'];
$total=(int)$conn->query("SELECT COUNT(*) n FROM attendance")->fetch_assoc()['n'];
$present=(int)$conn->query("SELECT COUNT(*) n FROM attendance WHERE status='Present'")->fetch_assoc()['n'];
$absent=(int)$conn->query("SELECT COUNT(*) n FROM attendance WHERE status='Absent'")->fetch_assoc()['n'];
respond(['success'=>true,'stats'=>['upcoming'=>$upcoming,'total'=>$total,'present'=>$present,'absent'=>$absent]]);
