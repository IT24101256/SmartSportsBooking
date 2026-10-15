import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    vus: 10,
    duration: '30s',

    thresholds: {
        http_req_failed: ['rate<0.05'],
        http_req_duration: ['p(95)<2000'],
    },
};

export default function () {
    const url =
        'http://localhost:5187/api/bookings/availability?facilityId=2&date=2026-10-08';

    const response = http.get(url);

    check(response, {
        'status is 200': (r) => r.status === 200,
    });

    sleep(1);
}