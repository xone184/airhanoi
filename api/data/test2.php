<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
$_SERVER['REQUEST_METHOD'] = 'GET';
$_GET['type'] = 'yearly_compare';
require 'statistics.php';
