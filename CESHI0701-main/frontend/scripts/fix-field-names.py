#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
批量替换需求说明书中的英文字段名为中文字段名
"""

import re

# 字段名映射表（英文 -> 中文）
FIELD_MAPPINGS = {
    # 通用字段
    'id': 'ID',
    'name': '名称',
    'code': '编码',
    'desc': '描述',
    'description': '描述',
    'status': '状态',
    'type': '类型',
    'createTime': '创建时间',
    'updateTime': '更新时间',
    'page': '当前页码',
    'pageSize': '每页大小',
    'remark': '备注说明',
    'photos': '现场照片URL列表',

    # 用户相关
    'username': '用户账号',
    'password': '用户密码',
    'rememberMe': '记住密码',
    'token': '令牌',
    'userId': '用户ID',
    'realName': '真实姓名',
    'roleId': '角色ID',
    'roleName': '角色名称',
    'permissions': '权限列表',

    # 时间相关
    'timeRange': '时间范围类型',
    'startTime': '开始时间',
    'endTime': '结束时间',
    'executeTime': '执行时间',
    'completeTime': '完成时间',
    'startDate': '开始日期',
    'endDate': '结束日期',
    'checkInTime': '打卡时间',
    'fillTime': '填写时间',

    # 统计相关
    'totalTasks': '总任务数',
    'completedTasks': '已完成任务数',
    'completionRate': '完成率',
    'overtimeTasks': '超时任务数',
    'inProgressTasks': '进行中任务数',
    'pendingExceptions': '待处理异常数',
    'handledExceptions': '已处理异常数',
    'exceptionTrend': '异常趋势数据',
    'exceptionTypeDistribution': '异常类型分布',
    'staffName': '人员姓名',
    'foundExceptions': '发现异常数',
    'avgCompletionTime': '平均完成时长',
    'ranking': '排名',

    # 区域相关
    'areaName': '区域名称',
    'areaId': '所属区域ID',
    'areaCode': '区域编码',
    'areaDesc': '区域描述',
    'parentId': '上级区域ID',

    # 巡检点相关
    'checkpointName': '巡检点名称',
    'checkpointId': '巡检点ID',
    'checkpointCount': '巡检点数量',
    'checkItems': '检查项配置',
    'locationDesc': '位置描述',
    'qrcodeUrl': '二维码URL',
    'qrcodeStatus': '二维码状态',
    'itemName': '检查项名称',
    'itemId': '检查项ID',
    'checkType': '检查类型',
    'checkResult': '检查结果',
    'isRequired': '是否必填',
    'sortOrder': '排序顺序',
    'checkInStatus': '打卡状态',
    'checkInLocation': '打卡位置',
    'checkInPhotos': '打卡照片URL列表',

    # 设备相关
    'deviceName': '设备名称',
    'deviceCode': '设备编号',
    'deviceType': '设备类型',
    'deviceStatus': '设备状态',
    'deviceDesc': '设备描述',

    # 路线相关
    'routeName': '路线名称',
    'routeId': '巡检路线ID',
    'checkpoints': '巡检点列表',
    'estimatedDuration': '预计时长',
    'actualDuration': '实际耗时',

    # 计划相关
    'planName': '计划名称',
    'executorId': '执行人ID',
    'executorIds': '执行人ID列表',
    'executorNames': '执行人姓名',
    'repeatType': '重复类型',
    'repeatConfig': '重复配置',

    # 任务相关
    'taskName': '任务名称',
    'taskId': '任务ID',
    'taskType': '任务类型',
    'taskDescription': '任务说明',
    'progress': '完成进度',

    # 异常相关
    'exceptions': '异常上报记录',
    'exceptionId': '异常ID',
    'exceptionType': '异常类型',
    'exceptionLevel': '异常等级',
    'exceptionDesc': '异常描述',
    'exceptionPhotos': '异常照片URL列表',
    'reportTime': '上报时间',
    'reporterId': '上报人ID',
    'reporterName': '上报人姓名',
    'handleStatus': '处理状态',
    'workOrderId': '关联的异常工单ID',

    # 轨迹相关
    'trackPoints': '执行轨迹GPS坐标列表',
    'longitude': '经度',
    'latitude': '纬度',
    'recordTime': '记录时间',
    'pointType': '坐标点类型',
    'gpsLocation': 'GPS位置',

    # 统计分析相关
    'teamId': '班组ID',
    'teamName': '所属班组名称',
    'executionRate': '执行率',
    'overtimeRate': '超时率',
    'pendingTasks': '待执行任务数',
    'taskTrend': '任务数量趋势数据',
    'completionRateTrend': '完成率趋势数据',
    'overtimeRateTrend': '超时率趋势数据',
    'statusDistribution': '任务状态分布数据',
    'executorDistribution': '执行人分布数据',
    'areaDistribution': '区域分布数据',
    'date': '日期',
    'category': '分类名称',
    'count': '数量',
    'percentage': '占比',
    'staffId': '人员ID',
    'executorName': '执行人姓名',

    # 填写记录相关
    'fillUserId': '填写人ID',
    'fillUserName': '填写人姓名',
    'checkInId': '打卡记录ID',
    'recordId': '记录ID',
    'voiceText': '语音转文字内容',

    # 操作日志相关
    'logId': '日志ID',
    'operatorId': '操作人ID',
    'operatorName': '操作人姓名',
    'operationType': '操作类型',
    'operationModule': '操作模块',
    'operationContent': '操作内容',
    'operationTime': '操作时间',
    'operationResult': '操作结果',
    'ipAddress': 'IP地址',
    'requestUrl': '请求URL',
    'requestMethod': '请求方法',
    'requestParams': '请求参数',
    'responseStatus': '响应状态码',
    'responseResult': '响应结果',
    'errorMessage': '错误信息',
    'beforeData': '操作前数据',
    'afterData': '操作后数据',
    'lastLoginTime': '最后登录时间',
}

def replace_field_names(content):
    """
    替换表格中的英文字段名为中文
    """
    lines = content.split('\n')
    result_lines = []

    for line in lines:
        # 只处理表格行（以 | 开头）
        if line.strip().startswith('|'):
            # 匹配表格第一列的英文字段名
            match = re.match(r'^\|\s*([a-z][a-zA-Z]*)\s*\|', line)
            if match:
                field_name = match.group(1)
                if field_name in FIELD_MAPPINGS:
                    # 替换字段名
                    chinese_name = FIELD_MAPPINGS[field_name]
                    line = re.sub(
                        r'^\|\s*' + re.escape(field_name) + r'\s*\|',
                        f'| {chinese_name} |',
                        line
                    )

        result_lines.append(line)

    return '\n'.join(result_lines)

def main():
    input_file = '危险厂区巡检系统需求说明书.md'

    # 读取文件
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # 替换字段名
    new_content = replace_field_names(content)

    # 写回文件
    with open(input_file, 'w', encoding='utf-8') as f:
        f.write(new_content)

    print(f'✅ 字段名替换完成！')

if __name__ == '__main__':
    main()
