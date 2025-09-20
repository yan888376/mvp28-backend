#!/bin/bash

# ===========================================
# MornGPT 后端 Smoke Test 脚本
# ===========================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
API_BASE_URL="${1:-http://localhost:3001}"
TEST_WECHAT_CODE="test_code_123"
TEST_USER_NICKNAME="测试用户"
ACCESS_TOKEN=""

echo -e "${BLUE}🚀 开始 MornGPT 后端 Smoke Test${NC}"
echo -e "${BLUE}API 地址: ${API_BASE_URL}${NC}"
echo ""

# 工具函数
log_test() {
    echo -e "${YELLOW}🧪 测试: $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# HTTP 请求函数
make_request() {
    local method=$1
    local url=$2
    local data=${3:-"{}"}
    local headers=${4:-"Content-Type: application/json"}
    
    if [[ -n "$ACCESS_TOKEN" && "$headers" != *"Authorization"* ]]; then
        headers="$headers;Authorization: Bearer $ACCESS_TOKEN"
    fi
    
    curl -s -X "$method" \
         -H "$(echo "$headers" | tr ';' '\n')" \
         -d "$data" \
         "$API_BASE_URL$url"
}

# 检查 JSON 响应
check_json_success() {
    local response=$1
    local success=$(echo "$response" | python3 -c "import sys, json; print(json.load(sys.stdin).get('success', False))" 2>/dev/null || echo "false")
    if [[ "$success" == "True" ]]; then
        return 0
    else
        return 1
    fi
}

# 提取 JSON 字段
extract_json_field() {
    local response=$1
    local field=$2
    echo "$response" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('$field', ''))" 2>/dev/null || echo ""
}

# 测试 1: 健康检查
test_health_check() {
    log_test "健康检查"
    
    local response=$(make_request "GET" "/api/health")
    
    if check_json_success "$response"; then
        log_success "健康检查通过"
        log_info "$(echo "$response" | python3 -c "import sys, json; data=json.load(sys.stdin); print(f\"状态: {data['data']['status']}, 版本: {data['data']['version']}\")" 2>/dev/null)"
    else
        log_error "健康检查失败"
        echo "$response"
        exit 1
    fi
}

# 测试 2: 微信登录
test_wechat_auth() {
    log_test "微信登录认证"
    
    local auth_data=$(cat <<EOF
{
  "code": "$TEST_WECHAT_CODE",
  "user_info": {
    "nickname": "$TEST_USER_NICKNAME",
    "avatar_url": "https://example.com/avatar.jpg"
  }
}
EOF
)
    
    local response=$(make_request "POST" "/api/auth/wechat" "$auth_data")
    
    if check_json_success "$response"; then
        ACCESS_TOKEN=$(extract_json_field "$response" "tokens" | python3 -c "import sys, json; print(json.load(sys.stdin).get('access_token', ''))" 2>/dev/null)
        local user_id=$(extract_json_field "$response" "user" | python3 -c "import sys, json; print(json.load(sys.stdin).get('id', ''))" 2>/dev/null)
        
        if [[ -n "$ACCESS_TOKEN" && -n "$user_id" ]]; then
            log_success "微信登录成功"
            log_info "用户 ID: $user_id"
            log_info "Access Token: ${ACCESS_TOKEN:0:20}..."
        else
            log_error "微信登录响应格式错误"
            echo "$response"
            exit 1
        fi
    else
        log_error "微信登录失败"
        echo "$response"
        exit 1
    fi
}

# 测试 3: 获取用户资料
test_user_profile() {
    log_test "获取用户资料"
    
    if [[ -z "$ACCESS_TOKEN" ]]; then
        log_error "没有访问令牌，跳过用户资料测试"
        return
    fi
    
    local response=$(make_request "GET" "/api/user/profile")
    
    if check_json_success "$response"; then
        local nickname=$(extract_json_field "$response" "user" | python3 -c "import sys, json; print(json.load(sys.stdin).get('nickname', ''))" 2>/dev/null)
        log_success "用户资料获取成功"
        log_info "昵称: $nickname"
    else
        log_error "用户资料获取失败"
        echo "$response"
    fi
}

# 测试 4: 发送聊天消息
test_chat_message() {
    log_test "发送聊天消息"
    
    if [[ -z "$ACCESS_TOKEN" ]]; then
        log_error "没有访问令牌，跳过聊天测试"
        return
    fi
    
    local chat_data=$(cat <<EOF
{
  "message": "你好，这是一条测试消息"
}
EOF
)
    
    local response=$(make_request "POST" "/api/chat" "$chat_data")
    
    if check_json_success "$response"; then
        local conversation_id=$(extract_json_field "$response" "conversation_id")
        local ai_content=$(extract_json_field "$response" "message" | python3 -c "import sys, json; print(json.load(sys.stdin).get('content', '')[:50])" 2>/dev/null)
        local quota_used=$(extract_json_field "$response" "quota" | python3 -c "import sys, json; print(json.load(sys.stdin).get('used_today', ''))" 2>/dev/null)
        
        log_success "聊天消息发送成功"
        log_info "会话 ID: $conversation_id"
        log_info "AI 回复: ${ai_content}..."
        log_info "今日已用额度: $quota_used"
    else
        log_error "聊天消息发送失败"
        echo "$response"
    fi
}

# 测试 5: 文件上传预签名
test_upload_presign() {
    log_test "文件上传预签名"
    
    if [[ -z "$ACCESS_TOKEN" ]]; then
        log_error "没有访问令牌，跳过上传测试"
        return
    fi
    
    local upload_data=$(cat <<EOF
{
  "filename": "test-image.jpg",
  "content_type": "image/jpeg",
  "size": 102400
}
EOF
)
    
    local response=$(make_request "POST" "/api/upload/presign" "$upload_data")
    
    if check_json_success "$response"; then
        local upload_id=$(extract_json_field "$response" "upload_id")
        local presigned_url=$(extract_json_field "$response" "presigned_url")
        
        log_success "文件上传预签名成功"
        log_info "上传 ID: $upload_id"
        log_info "预签名 URL: ${presigned_url:0:50}..."
    else
        log_error "文件上传预签名失败"
        echo "$response"
    fi
}

# 测试 6: 定位上报
test_location_report() {
    log_test "定位上报"
    
    if [[ -z "$ACCESS_TOKEN" ]]; then
        log_error "没有访问令牌，跳过定位测试"
        return
    fi
    
    local location_data=$(cat <<EOF
{
  "latitude": 39.9042,
  "longitude": 116.4074,
  "accuracy": 10.5,
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"
}
EOF
)
    
    local response=$(make_request "POST" "/api/location/report" "$location_data")
    
    if check_json_success "$response"; then
        log_success "定位上报成功"
    else
        log_error "定位上报失败"
        echo "$response"
    fi
}

# 测试 7: 支付下单 (模拟)
test_payment_checkout() {
    log_test "支付下单"
    
    if [[ -z "$ACCESS_TOKEN" ]]; then
        log_error "没有访问令牌，跳过支付测试"
        return
    fi
    
    local payment_data=$(cat <<EOF
{
  "amount": 100,
  "description": "测试充值订单"
}
EOF
)
    
    local response=$(make_request "POST" "/api/pay/checkout" "$payment_data")
    
    if check_json_success "$response"; then
        local order_no=$(extract_json_field "$response" "order_no")
        log_success "支付下单成功"
        log_info "订单号: $order_no"
    else
        log_error "支付下单失败 (预期，因为可能缺少微信配置)"
        log_info "错误信息: $(echo "$response" | python3 -c "import sys, json; print(json.load(sys.stdin).get('error', {}).get('message', 'Unknown error'))" 2>/dev/null)"
    fi
}

# 测试 8: 获取会话列表
test_conversations_list() {
    log_test "获取会话列表"
    
    if [[ -z "$ACCESS_TOKEN" ]]; then
        log_error "没有访问令牌，跳过会话列表测试"
        return
    fi
    
    local response=$(make_request "GET" "/api/conversations?page=1&size=10")
    
    if check_json_success "$response"; then
        local total=$(extract_json_field "$response" "pagination" | python3 -c "import sys, json; print(json.load(sys.stdin).get('total', 0))" 2>/dev/null)
        log_success "会话列表获取成功"
        log_info "总会话数: $total"
    else
        log_error "会话列表获取失败"
        echo "$response"
    fi
}

# 测试 9: 错误处理
test_error_handling() {
    log_test "错误处理"
    
    # 测试无效端点
    local response=$(make_request "GET" "/api/invalid-endpoint")
    local status_code=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE_URL/api/invalid-endpoint")
    
    if [[ "$status_code" == "404" ]]; then
        log_success "404 错误处理正确"
    else
        log_error "404 错误处理异常，状态码: $status_code"
    fi
    
    # 测试无效 token
    local response=$(make_request "GET" "/api/user/profile" "{}" "Authorization: Bearer invalid-token")
    local success=$(echo "$response" | python3 -c "import sys, json; print(json.load(sys.stdin).get('success', True))" 2>/dev/null || echo "true")
    
    if [[ "$success" == "False" ]]; then
        log_success "无效 token 错误处理正确"
    else
        log_error "无效 token 错误处理异常"
    fi
}

# 主函数
main() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}         MornGPT 后端 Smoke Test${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    
    # 检查依赖
    if ! command -v python3 &> /dev/null; then
        log_error "需要 Python 3 来解析 JSON 响应"
        exit 1
    fi
    
    if ! command -v curl &> /dev/null; then
        log_error "需要 curl 来发送 HTTP 请求"
        exit 1
    fi
    
    # 执行测试
    test_health_check
    echo ""
    
    test_wechat_auth
    echo ""
    
    test_user_profile
    echo ""
    
    test_chat_message
    echo ""
    
    test_upload_presign
    echo ""
    
    test_location_report
    echo ""
    
    test_payment_checkout
    echo ""
    
    test_conversations_list
    echo ""
    
    test_error_handling
    echo ""
    
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}         Smoke Test 完成 ✅${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "${BLUE}💡 提示: 某些测试可能因为外部服务配置而失败，这是正常现象${NC}"
    echo -e "${BLUE}💡 在生产环境中运行前，请确保所有外部服务都已正确配置${NC}"
}

# 运行主函数
main "$@"