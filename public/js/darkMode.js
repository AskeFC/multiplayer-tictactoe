'use strict';

const getCookie = (cname) => {
    const name = cname + "=";
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');
    for (let i = 0, iEnd = ca.length; i < iEnd; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        };
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        };
    };
    return "";
};

// Dark Mode Toggle
const toggleDarkMode = () => {
    document.body.classList.toggle('dark');
    if (document.body.classList.contains('dark')) {
        document.cookie = "darkMode=true";
    } else {
        document.cookie = "darkMode=false";
    };
};

const checkDarkMode = () => {
    const darkModeCookie = getCookie('darkMode');
    if (darkModeCookie === "true") {
        document.body.classList.add('dark');
        document.getElementById('dark-mode-checkbox').checked = true;
    } else {
        document.body.classList.remove('dark');
    };
};

checkDarkMode();