const days_width = '160px';
const days_height = '140px';
const days_padding = '10px';
window.addEventListener('DOMContentLoaded', async () => {
    const lunar = window.api.lunar;
    const ipcRenderer = window.api.ipcRenderer;
    const daysContainer = document.getElementById('days');
    const currentMonthElement = document.getElementById('current-month');
    const prevButton = document.getElementById('prev');
    const nextButton = document.getElementById('next');

    let currentDate = new Date();
    const holidays = await ipcRenderer.invoke('get-holidays');
    //console.log(holidays);
    function getChineseDate(year, month, day) {
        const solarDate = new Date(year, month, day);
        //console.log(solarDate);
        const lunarDate = lunar.solarToLunar(solarDate.getFullYear(), solarDate.getMonth() + 1, solarDate.getDate());
        //console.log(lunarDate);
        if (lunarDate.lunarFestival) {
            lunarDate.lunarFestival;
        } else {
            lunarDate.lunarFestival = '';
        }
        if (lunarDate.lunarMonthName === '闰') {
            return `闰${lunarDate.lunarMonth}${lunarDate.lunarDay}`+'<br>'+lunarDate.lunarFestival
        }
        if (lunarDate.lunarDayName === '初一') {
            return lunarDate.lunarMonthName+' '+lunarDate.lunarFestival;
        }
        return lunarDate.lunarDayName+' '+lunarDate.lunarFestival
    }

    function getHoliday(year, month, day) {
        const _day = day < 10 ? '0' + day : day;
        const _month = month + 1 < 10 ? '0' + (month + 1) : month + 1;
        const dateKey =`${year}-${_month}-${_day}`;
        //console.log(dateKey);
        return holidays[dateKey] || '';
    }

    async function editTodo(todoKey, todo) {
        const newTodo = await ipcRenderer.invoke('edit-todo', todo);
        if (newTodo !== null) {
            await ipcRenderer.invoke('set-todo', todoKey, newTodo);
            renderCalendar(currentDate);
        }
    }

    async function renderCalendar(date) {
        daysContainer.innerHTML = '';
        const year = date.getFullYear();
        const month = date.getMonth();
        const today = new Date();

        currentMonthElement.textContent = date.toLocaleString('zh-CN', {
            month: 'long',
            year: 'numeric',
        });

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // 填充空白天
        for (let i = 0; i < firstDay; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.style.width = days_width; // 设置空白天的宽度
            emptyCell.style.height = days_height; // 设置空白天的高度
            emptyCell.style.padding = days_padding;
            daysContainer.appendChild(emptyCell);
        }

        // 填充当前月份的每一天
        for (let day = 1; day <= daysInMonth; day++) {
            const dayCell = document.createElement('div');
            const lunarDate = getChineseDate(year, month, day);
            const holiday = getHoliday(year, month, day);
            const todoKey = `${year}-${month + 1}-${day}`;
            const todo = await ipcRenderer.invoke('get-todo', todoKey);
            // 判定是否是节日
            if (holiday) {
                dayCell.innerHTML = `
                <div style="font-size: 16px;display: inline;font-weight:bold;color:white">${day} ${lunarDate}</div>
                <div style="font-size: 16px; color: red;display: inline; font-weight:bold">${holiday}</div>
                <div class="todo" style="overflow-y:auto">${todo}</div>
            `;
                if (holiday === '班') {
                    dayCell.style.background = 'rgba(207, 9, 247, 0.2)';
                } else{
                    dayCell.style.background = 'rgba(131, 26, 26, 0.5)';
                }
            }
            else {
                dayCell.innerHTML = `
                <div style="font-size: 16px;display: inline;font-weight:bold;color:white">${day} ${lunarDate}</div>
                <div style="font-size: 16px; color: red;display: inline;">${holiday}</div>
                <div class="todo" style="overflow-y:auto">${todo}</div>
            `;}
            dayCell.style.width = days_width; // 设置日期方框的宽度
            dayCell.style.height = days_height; // 设置日期方框的高度
            dayCell.style.padding = days_padding;
            dayCell.style.border = '1px solid #ddd';
            dayCell.style.textAlign = 'left';
            dayCell.style.cursor = 'pointer';

            // 为当天日期添加特殊样式
            //console.log(year, month, day, today.getFullYear(), today.getMonth(), today.getDate());
            if (year === today.getFullYear() && month === today.getMonth() && day === today.getDate()) {
                dayCell.style.background = 'rgba(10, 219, 167, 0.3)';
            }

            dayCell.addEventListener('click', () => {
                editTodo(todoKey, todo);
            });
            daysContainer.appendChild(dayCell);
        }
    }

    prevButton.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar(currentDate);
    });

    nextButton.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar(currentDate);
    });

    renderCalendar(currentDate);
});